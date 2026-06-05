---




name: dns-networking
description: Operator's manual for DNS covering zone files, resource records, query resolution lifecycle, operational commands, TSIG/DNSSEC security, and production troubleshooting recipes.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: networking
  triggers: dns, bind, zone file, named.conf, resource records, dig nslookup, how do i manage dns, dnssec tsig
  role: reference
  scope: infrastructure
  output-format: manifests
  related-skills: linux-cli-reference
  archetypes: educational
  anti_triggers: implement from scratch, architect a system, build infrastructure, design patterns
  response_profile:
    verbosity: high
    directive_strength: low
    abstraction_level: operational




---





# DNS and Networking — Quick Reference

Operator's manual for DNS covering the mental model needed to read named.conf, every resource record you'll meet in practice, the lifecycle of a DNS query, operational commands, security (TSIG and DNSSEC), and troubleshooting recipes for production.

## When to Use

- Staring at a zone file and needing to remember trailing dot conventions, SOA record fields, and delegation behavior
- Being handed an existing BIND deployment and needing to be productive quickly
- Adding a record, retiring a host, moving a service, or delegating a subdomain without breaking dependencies
- Determining within two minutes whether "the site is down" is DNS, networking, application, or something else
- Modernizing: turning on DNSSEC, switching to TSIG-secured zone transfers, replacing nslookup with dig, moving from BIND to hosted

## When NOT to Use

- For a deep dive on the protocol's bytes-on-the-wire — read the RFCs (1034, 1035, 6604, 6891, 8482, 9156)
- For non-BIND server documentation (Knot DNS, NSD, Unbound, PowerDNS, Microsoft DNS Server) — most concepts transfer but config syntax differs
- For DHCP integration, IPAM tooling, or DNS-as-a-Service specific tooling (Route 53, Cloud DNS, Azure DNS)

## Mental model

A few sentences you can hold in your head and lean on for everything
else:

1. **DNS is a tree.** The root is the dot at the end of every fully
   qualified name. Top-level domains (`com.`, `org.`, `net.`,
   `io.`, `uk.`, …) are children of the root. Below the TLDs are the
   "second level" domains people register, and below those are the
   leaves (host names, service names, alias names). A *domain* is a
   subtree; a *zone* is the part of a domain that one server is
   authoritative for; the difference between domain and zone is
   *delegation* (the parent has handed off responsibility for a
   subtree to another server, so the parent's zone stops at the
   delegation point).
2. **A name is read leaf-to-root.** `www.example.com.` is the host
   `www` inside the zone `example.com.`, which is below the TLD
   `com.`, which is below the root `.`. The trailing dot is the root.
   In zone files, an unqualified name (no trailing dot) is treated as
   *relative* to the current `$ORIGIN`; an absolute name has the
   trailing dot.
3. **Resolution walks the tree top-down with caching at every step.**
   Your machine asks a *recursive resolver* (configured in
   `/etc/resolv.conf`, `systemd-resolved`, or the platform
   equivalent). The resolver, on a cache miss, asks a root server,
   then a TLD server, then the zone's authoritative server,
   following *referrals* down. Each step's answer goes into the
   resolver's cache for the record's TTL.
4. **The data is *resource records* attached to names.** A name like
   `mail.example.com.` can have multiple records of different types
   attached: an `A` record for the IPv4 address, an `AAAA` for IPv6,
   maybe an `MX` saying that this host is a mail exchanger for some
   other domain, maybe a `TXT` for SPF or DKIM, maybe a `CNAME`
   pointing somewhere else (but only if no other records exist on
   that name).
5. **Authoritative vs. recursive.** An authoritative server holds
   real data for some zones and answers questions only about those
   zones. A recursive resolver holds no data of its own; it walks the
   tree and caches what it learns. Most servers can do both, but the
   modern best practice is to keep them separate — authoritative
   servers should not do recursion, recursive resolvers should not
   serve zones.
6. **TTL is a contract.** When an authoritative server hands you a
   record, the TTL on it tells every cache in the world how long they
   may keep that answer before re-asking. A short TTL means changes
   propagate fast at the cost of more queries to the authoritative
   servers; a long TTL means the opposite. Plan TTL drops *before*
   any change you want to take effect quickly.
7. **Almost every DNS bug is one of three things:** a stale cache
   somewhere; a serial number that wasn't bumped, so secondaries
   never pulled the new zone; or a missing trailing dot in a zone
   file, which silently turned `mail.example.com.` into
   `mail.example.com.example.com.`.

The rest of this card is the long form of those seven sentences.

---

## The namespace, names, and zones

### How the tree is structured

The DNS namespace is a tree, similar in shape to a UNIX filesystem
turned upside down. The root sits at the top, written as a single dot
`.`. Its children are the *top-level domains* (TLDs): generic ones
like `com.`, `net.`, `org.`, `info.`, `io.`, `dev.`, and the country
codes like `uk.`, `de.`, `jp.`, `nz.`, plus a long tail of newer
TLDs. Below each TLD live the *second-level domains* people
register — `example.com.`, `wikipedia.org.`, `nytimes.com.`. Below
those, the holder of the second-level domain is free to put whatever
structure makes sense — `www`, `mail`, `api`, sub-environments
(`prod.`, `staging.`), per-team or per-service subdomains, and so on.

Each node in the tree has a *label* — the part between dots — that
can be up to 63 characters long. The root's label is the empty
string. The full domain name of any node is the sequence of labels
from that node up to the root, written left-to-right with dots as
separators. Names are always read from leaf to root.

There's a hard limit of 255 octets on the wire-format length of a
domain name, including length bytes between labels and the
zero-byte root label. In practice, that means around 253 printable
ASCII characters across all the labels.

### Absolute names, relative names, and the trailing dot

A domain name written with a trailing dot is *absolute* (also called
*fully qualified*). The trailing dot is the root label. The name
`www.example.com.` is unambiguous and complete. Without the trailing
dot, the name is *relative*, and what it resolves to depends on
context:

- In a zone file, a relative name has the current `$ORIGIN` appended
  to it. If the current `$ORIGIN` is `example.com.` and you write
  `www`, that means `www.example.com.`. If you write
  `www.example.com` *without the trailing dot*, the origin is still
  appended and you've just defined a record for the name
  `www.example.com.example.com.` — almost always not what you wanted.
- On the command line and in resolver libraries, a relative name is
  passed through the *search list* (configured in `resolv.conf` or
  the platform's equivalent), which appends each search-list entry
  in turn until something resolves.
- In application configuration, behaviour varies. Most modern
  software treats names as absolute even without a trailing dot;
  some legacy software does search-list expansion. When in doubt,
  spell out the absolute name.

The trailing-dot rule in zone files is the single most common source
of mistakes when editing DNS data by hand. Pre-flight every change
with `named-checkzone` (or your provider's equivalent linter)
before pushing it.

### Domains versus zones

A *domain* is a subtree of the namespace. The `example.com.` domain
includes `example.com.` itself, every direct child like
`www.example.com.` and `mail.example.com.`, and every grandchild
like `db.prod.example.com.` and so on, all the way down.

A *zone* is the unit of administrative control — the chunk of a
domain that a particular set of authoritative servers serves
directly. Zones are bounded by *delegation*. If `example.com.`
delegates `prod.example.com.` to a different set of servers, then
`example.com.` and `prod.example.com.` are two zones, even though
they're nested in the same domain.

The same name can be a node in a domain *and* the apex of a zone.
The apex of a zone is the topmost node — for the `example.com.`
zone, the apex is `example.com.` itself. The apex must hold an
`SOA` record and at least one `NS` record. Apex CNAMEs are illegal.

### Reading domain names

A few worked examples to build intuition:

- `mail.support.example.co.uk.` — `mail` is a host or service name
  inside the `support.example.co.uk.` zone, which lives under
  `example.co.uk.`, which lives under `co.uk.` (the conventional
  British-commercial second level), which lives under the country
  TLD `uk.`.
- `_dmarc.example.com.` — the underscore at the start is a
  convention for DNS-based service location names. This one holds
  the DMARC policy `TXT` record for `example.com.`.
- `15.16.192.in-addr.arpa.` — a name in the reverse-mapping namespace
  for the IPv4 address `192.16.15.x`. The octets are reversed because
  IPv4 addresses get more specific from left to right while DNS
  names get less specific from left to right.

### The reverse-mapping namespace

Forward mapping (name → address) is the obvious case. Reverse
mapping (address → name) uses a special branch of the namespace
called `in-addr.arpa.` for IPv4 and `ip6.arpa.` for IPv6.

For IPv4, the reverse name is built by reversing the dotted-quad of
the IP address and appending `in-addr.arpa.`. So the reverse name
for `192.16.15.10` is `10.15.16.192.in-addr.arpa.`. The records
attached to that reverse name are *PTR* records that name the host.

The octets are reversed because of how delegation works. The owner
of network `192.16.0.0/16` is responsible for everything beneath
`16.192.in-addr.arpa.`, and they may delegate `15.16.192.in-addr.arpa.`
(the `192.16.15.0/24` subnet) further. By putting the most general
octet (`192.`) closest to the root, you can delegate by network
boundary the same way you delegate by name boundary in the forward
namespace.

For IPv6 the convention is similar but uses one nibble per label,
reversed, under `ip6.arpa.`. The address `2001:db8::1` becomes
`1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.`. In
practice, you'll generate these mechanically with your tooling, not
by hand.

### Delegation

Delegation is how authority for a subtree gets handed off. The
parent zone keeps `NS` records pointing at the authoritative
servers for the child zone. Optionally, if the child's name servers
are themselves inside the child zone, the parent also includes
*glue records* — `A` and `AAAA` records giving the addresses of the
child's name servers, breaking what would otherwise be a chicken-
and-egg lookup.

For example, if `example.com.` delegates `prod.example.com.` to
servers `ns1.prod.example.com.` and `ns2.prod.example.com.`, the
`example.com.` zone needs:

```
prod.example.com.    NS    ns1.prod.example.com.
prod.example.com.    NS    ns2.prod.example.com.
ns1.prod.example.com. A    192.0.2.10     ; glue
ns2.prod.example.com. A    192.0.2.11     ; glue
```

Without the glue records, a resolver trying to find a name in
`prod.example.com.` would receive the `NS` records, then try to
look up `ns1.prod.example.com.` and find that the only place that
name is defined is *inside the very zone it's trying to reach*. Glue
breaks the loop.

If the child's name servers live in a different zone (e.g. you use
a hosted provider, so your `NS` records point at the provider's
name servers), no glue is needed because resolvers can resolve
those servers' names through the regular namespace.

### Subdomains versus delegated zones

A subdomain doesn't have to be a separate zone. If you want
`prod.example.com.` to be its own administrative scope with its own
authoritative servers, you delegate. If you just want some records
under that name (`web.prod.example.com.`, `db.prod.example.com.`)
served by the same servers as the parent, you don't have to
delegate — you just put those records in the `example.com.` zone
file directly, with their full names. Most organisations use a mix:
delegation when teams are independent, no delegation when
everything is run by one team.

---

## Resolution: how a query travels from a client to an answer

Every DNS query you ever issue follows roughly the same path. Knowing
the path is the difference between guessing at why something is broken
and pointing at the exact step that's failing.

### The actors

- **Stub resolver** — the small piece of code in your operating
  system that takes a `getaddrinfo()` call and turns it into a DNS
  query. The stub knows how to send a query, wait for an answer, and
  hand the result back. It does not walk the namespace; it asks one
  question and expects the recursive resolver to do the work.
- **Recursive resolver** (also called a "recursive nameserver" or
  just "recursor") — the server that walks the tree on the stub's
  behalf, follows referrals, caches what it learns, and returns a
  final answer or an error. Your ISP runs one. Your laptop, on most
  modern OSes, runs a tiny one of its own (`systemd-resolved` on
  Linux, `mDNSResponder` on macOS). Your office network usually has
  one or more (often a Windows DC, or a dedicated Pi-hole / AdGuard
  Home / Unbound box). You can also use a public resolver like
  `1.1.1.1` (Cloudflare), `8.8.8.8` (Google), or `9.9.9.9` (Quad9).
- **Authoritative server** — the server that holds the master copy
  (or a slave/secondary copy) of a zone's data and answers
  authoritative questions about that zone. Different zones have
  different authoritative servers. The root zone has the 13
  named root servers (`a.root-servers.net.` through
  `m.root-servers.net.`), each of which is in fact many physically
  distributed instances behind anycast.

### Recursive vs. iterative queries

A *recursive* query says "answer this for me; do whatever work is
necessary, including asking other servers, and come back with a
final answer." Stubs ask their resolver recursive queries.

An *iterative* query says "answer this if you can; if you can't,
tell me who to ask next." Recursors ask authoritative servers
iterative queries — the authoritative server either answers
authoritatively or refers them to another server "closer" to the
answer.

Most modern recursive resolvers refuse recursive queries from
clients that aren't on their authorized list (otherwise they'd be
*open resolvers* — useful as DDoS amplifiers and almost nothing
else).

### The full walk, step by step

Imagine your laptop wants the IPv4 address for
`shop.example.co.uk.`. Your `resolv.conf` lists `1.1.1.1` as your
resolver. Cache is cold everywhere.

1. Your stub builds a UDP query: "A record for
   `shop.example.co.uk.`?". Sends it to `1.1.1.1` on port 53.
2. `1.1.1.1` checks its cache. Cache miss. It needs to walk the
   tree. It always knows the addresses of the root servers (from a
   built-in *root hints* file).
3. `1.1.1.1` picks a root server, say `a.root-servers.net.`, and
   sends the same iterative query: "A record for
   `shop.example.co.uk.`?".
4. The root server doesn't know about `shop.example.co.uk.` —
   that's far below it — but it knows who's authoritative for
   `uk.`. It sends a *referral*: "ask one of the `uk.` name
   servers", together with `NS` records for the `uk.` zone and
   glue `A`/`AAAA` records for them.
5. `1.1.1.1` caches the `uk.` `NS` records and picks one of the
   `uk.` servers. Sends the same query.
6. The `uk.` server doesn't know about `shop.example.co.uk.`
   either, but it knows who's authoritative for `co.uk.`. Another
   referral, this time to the `co.uk.` name servers.
7. Same dance. The `co.uk.` server refers to the `example.co.uk.`
   name servers.
8. `1.1.1.1` finally asks an `example.co.uk.` authoritative server
   for the `A` record. The authoritative server has the answer
   and returns it, with the `aa` (authoritative answer) flag set
   and a TTL.
9. `1.1.1.1` caches the answer for the TTL and forwards it back to
   your stub.
10. Your stub passes it to `getaddrinfo()`, which passes it to your
    application, which can now `connect()`.

If the same query happens again within the TTL, step 2 is a cache
hit and the whole walk is short-circuited. Even partial caching
helps — once `1.1.1.1` knows the `co.uk.` name servers, future
queries for any `*.co.uk.` name skip the root and `uk.` lookups.

### Recursion vs. forwarding

Some recursive resolvers don't walk the tree themselves; they
*forward* every query to a designated upstream resolver and trust
that resolver to do the recursion. In a corporate network, a small
local resolver inside a branch office often forwards everything to
a central resolver inside HQ, which does the actual recursion.
Forwarding is configured per-zone or globally:

```
options {
  forwarders { 192.0.2.10; 192.0.2.11; };
  forward only;          # or "first" — see below
};
```

`forward only` means "always send to the forwarders; if they don't
answer, return failure". `forward first` means "send to the
forwarders first, but if they're unreachable, fall back to walking
the tree yourself."

Forwarders are most useful when:

- You have one upstream resolver with a much larger cache than
  yours, so forwarding amortises the recursion work.
- The authoritative servers you need to reach are accessible only
  from one specific resolver (DNS over a VPN, for example).
- Internal "split-horizon" naming where some names should resolve
  inside the company differently from outside.

### Round-trip time and server selection

When a recursor has multiple authoritative servers to choose from
(every zone has at least two), it remembers the round-trip time
(RTT) to each and prefers the fastest. Until it has measured RTT
for a server, it gives that server a small random initial RTT, so
the first few queries fan out across the available servers and
build up real measurements. After a few queries, the recursor
"locks on" to whichever authoritative server is fastest from its
network position.

This is why a single misbehaving authoritative server in a set is
often hard to detect — the resolver quietly stops querying it. The
fix is monitoring (probe each authoritative server directly with
`dig @server name`) rather than relying on resolver behaviour.

### Negative caching and NXDOMAIN

If a name doesn't exist, the authoritative server returns
`NXDOMAIN` (status code 3). Resolvers cache `NXDOMAIN` answers too,
so a hammering of queries for a non-existent name doesn't keep
hitting the authoritative servers. The TTL on negative cache
entries comes from the `SOA` record's *minimum* (now repurposed
as the negative-caching TTL — see SOA discussion below).

If the name exists but the requested *type* doesn't (e.g. you ask
for an `MX` record on a name that only has `A` records), you get
`NOERROR` with no answer records and an empty `ANSWER` section
plus an `AUTHORITY` section containing the SOA. This is "no data,
domain exists", different from `NXDOMAIN`.

### Truncation and the move to TCP

DNS over UDP has a 512-byte limit per response (without EDNS — see
below). If the answer is bigger, the server sets the `TC`
(truncated) flag in the UDP response and the client should retry
over TCP, which has no such limit. Most modern DNS uses *EDNS0*
(Extension Mechanisms for DNS) to negotiate a larger UDP payload
size — typically 4096 bytes — but firewalls that block fragmented
UDP or large DNS-over-UDP packets break this and force fallback to
TCP. Make sure both UDP/53 and TCP/53 are open to and from your
authoritative servers; some old firewall rules only permit UDP/53
on the assumption that "DNS is UDP", which is no longer accurate.

### Modern transports: DoT and DoH

Two newer transports encrypt DNS traffic between stub and
recursor:

- **DNS over TLS (DoT)** — DNS over a TLS tunnel on TCP/853.
- **DNS over HTTPS (DoH)** — DNS queries inside HTTPS POST or GET
  on TCP/443.

Both protect the stub-to-recursor leg from passive observation.
Neither encrypts the recursor-to-authoritative leg (that's
"authoritative DoT/DoH" and is a separate, less widely deployed
proposal). DoH is mostly visible to operators because some browsers
(Firefox, Chrome) ship with DoH on by default, bypassing the
operating system's resolver entirely. That can be a benefit
(privacy in hostile networks) or a problem (corporate DNS-based
filtering and split-horizon stop working).

### Stub resolver configuration

On Linux, the classic configuration file is `/etc/resolv.conf`:

```
nameserver 1.1.1.1
nameserver 8.8.8.8
search corp.example.com example.com
options timeout:2 attempts:2 rotate
```

- `nameserver` — IP of a recursive resolver. Up to three are
  honored. Queried in order, with retries on the second and third
  if the first times out.
- `search` — list of suffixes to append to single-label names.
  `ssh foo` with the search list above will try `foo.corp.example.com.`,
  then `foo.example.com.`, then `foo.` if both fail.
- `domain` — older alternative to `search`, equivalent to
  `search ONE_DOMAIN`.
- `options` — per-resolver tweaks. `timeout:N` is per-server,
  `attempts:N` is rounds across all servers, `rotate` round-robins
  across servers, `ndots:N` controls how many dots a name must
  have before it's tried as-is before search-list expansion.

On modern systemd Linux, `/etc/resolv.conf` is often a symlink to
something `systemd-resolved` manages, and the real configuration
lives in `/etc/systemd/resolved.conf` and per-link settings.
`resolvectl status` shows what's actually in effect per network
link.

On macOS, network DNS configuration is in System Settings →
Network → (interface) → DNS. You can override via
`scutil --dns` to inspect, or by writing files into
`/etc/resolver/` for per-domain overrides (handy for development
when a corporate VPN's name servers should only handle the
company's domain).

On Windows, DNS configuration is per-adapter in `Network and
Sharing Center` and visible from PowerShell with `Get-DnsClient`
and `Get-DnsClientServerAddress`.

---

## Resource records, in detail

A *resource record* (RR) is one row of DNS data: a name, a class, a
type, a TTL, and a type-specific *RDATA* payload. Records are grouped
into *resource record sets* (RRsets) — all records with the same
name, class, and type live in the same RRset and are signed and
served as a unit.

The class is almost always `IN` (Internet); the other historic
classes (`CH` for Chaosnet, `HS` for Hesiod) are essentially gone in
2025 production. You can omit `IN` from zone files; it's the default.

A few records you'll see all the time, in approximate order of how
often you'll edit them.

### A — IPv4 address

Maps a name to a 32-bit IPv4 address.

```
www.example.com.    300    IN  A     192.0.2.10
www.example.com.    300    IN  A     192.0.2.11
www.example.com.    300    IN  A     192.0.2.12
```

A name can have multiple `A` records. Resolvers receive all of them
and the application picks one (typically just the first, but better
clients try each in turn on connection failure). Most authoritative
servers rotate the order of `A` records on each response — the
*round-robin* effect — to spread load across endpoints. Modern
deployments use a load balancer or a service mesh in front rather
than relying on round-robin DNS, but the latter is still common for
geo-DNS and simple two-or-three-IP setups.

### AAAA — IPv6 address

Maps a name to a 128-bit IPv6 address. Pronounced "quad-A". The
record type was originally proposed as `A6` with a more elaborate
mechanism for prefix delegation, then simplified to `AAAA`.

```
www.example.com.    300    IN  AAAA  2001:db8::1
www.example.com.    300    IN  AAAA  2001:db8::2
```

Modern dual-stack deployments publish both `A` and `AAAA` for a
given service. Clients that have IPv6 connectivity prefer `AAAA`
(per RFC 6724); if the IPv6 path is broken, "Happy Eyeballs"
(RFC 8305) lets the client race the v4 and v6 paths and use
whichever wins.

### CNAME — canonical name (alias)

Aliases one name to another.

```
www.example.com.    300    IN  CNAME corporate-lb.example.com.
```

A query for `www.example.com.` returns the `CNAME` plus the records
the resolver looked up at the canonical name. Most stub resolvers
follow the chain transparently and the application sees a final
`A`/`AAAA` answer.

The CNAME rules to commit to memory:

- A name with a `CNAME` record may not have *any other records*. So
  you can't put a `CNAME` and an `MX` on the same name.
- The apex of a zone may not be a `CNAME`. The apex must have an
  `SOA` and at least one `NS`, and `CNAME` excludes coexistence.
  Some hosted DNS providers offer "alias", "ANAME", or
  "flattened CNAME" records that look like an apex CNAME from the
  outside but resolve into `A`/`AAAA` records server-side.
- `CNAME` chains work, but each hop costs another lookup. Three
  deep is fine; ten deep is a smell.
- Don't use `CNAME` for an `MX` target or an `NS` target. Both must
  point to names with concrete `A`/`AAAA` records, not aliases.

### MX — mail exchanger

Names a mail-receiving host for a domain, with a *preference* value
that orders multiple MX records.

```
example.com.    3600    IN  MX  10  mail1.example.com.
example.com.    3600    IN  MX  20  mail2.example.com.
example.com.    3600    IN  MX  20  mail3.example.com.
```

Lower preference value = higher priority. Senders try the lowest
first; on failure or among equals, they pick from the next bracket.
Equal values let the sender pick freely (a form of load balancing).
The MX target must be a name with `A`/`AAAA` records — never an
IP literal, never a `CNAME`.

A name with no `MX` records but with `A`/`AAAA` records will, in
practice, still receive mail at the `A`/`AAAA` address (most senders
will fall back to the address record). Even so, publish at least
one `MX` to make your intent explicit and to save senders an extra
lookup.

A "null MX" record — `MX 0 .` — explicitly declares that a domain
does not accept mail (RFC 7505). Useful for service-only domains
that should reject mail rather than have it silently bounce or
deliver somewhere wrong.

### NS — name server

Lists an authoritative name server for the zone. Required at the
zone apex; also used at delegation points to point to the child
zone's name servers.

```
example.com.    86400   IN  NS  ns1.example.com.
example.com.    86400   IN  NS  ns2.example.com.

prod.example.com.  86400  IN  NS  ns1.prod.example.com.   ; delegation
prod.example.com.  86400  IN  NS  ns2.prod.example.com.   ; delegation
```

The set of NS records at the apex of a zone *must agree* with the
NS records held in the parent for the delegation. Mismatches between
parent and child name server lists cause partial reachability
problems that are infuriating to diagnose. The parent's NS records
are what resolvers actually use to find the zone; the child's NS
records show up in answers and should be the same list.

### SOA — start of authority

The single most important record at the apex of every zone.
Exactly one SOA per zone.

```
example.com.   86400   IN  SOA   ns1.example.com.  hostmaster.example.com.  (
                                  2025051601    ; serial
                                  3600          ; refresh
                                  600           ; retry
                                  604800        ; expire
                                  300           ; minimum / negative TTL
                                  )
```

Field by field:

- **MNAME** (`ns1.example.com.`) — the *primary master* name server
  for the zone. Conventionally one of your authoritative servers,
  typically the one with the live editable copy. Used by NOTIFY
  messages to tell secondaries to refresh.
- **RNAME** (`hostmaster.example.com.`) — administrator email.
  Replace the first dot with `@` to read it: in this case
  `hostmaster@example.com`. The convention is to publish a generic
  alias rather than a person's address.
- **SERIAL** — version number of the zone. Bump it whenever you
  change anything. Secondaries compare their stored serial to the
  primary's serial during refresh; if it's different, they request
  a transfer. Two common formats: `YYYYMMDDnn` (date plus a
  two-digit counter for multiple changes per day) and a Unix epoch
  timestamp. Either works. Just bump it.
- **REFRESH** — how often (seconds) secondaries should poll the
  primary for changes. With NOTIFY in modern BIND this is mostly
  cosmetic, but it's still the fallback if NOTIFY messages don't
  arrive.
- **RETRY** — if a refresh fails (primary unreachable), how long
  before the secondary retries.
- **EXPIRE** — if a secondary can't reach the primary for this
  long, the secondary stops serving the zone. Set to a value
  comfortably longer than any plausible primary outage; one week
  is a common default, two weeks is generous.
- **MINIMUM** — historical name; today this is the *negative TTL*.
  Resolvers cache `NXDOMAIN` and `NODATA` answers from this zone
  for this many seconds. RFC 2308 redefined the field this way;
  before BIND 8.2 it set the default record TTL, which is now
  controlled by `$TTL` at the top of the zone file.

A common, sane SOA looks like:

```
@   IN  SOA  ns1   hostmaster   ( 2025051601   1h   15m   2w   1h )
```

(short form using `@` for the apex and unqualified MNAME/RNAME, both
appended by the current `$ORIGIN`.)

### PTR — pointer

Maps an address back to a name. Lives in the reverse-mapping zones
(`in-addr.arpa.`, `ip6.arpa.`).

```
10.15.16.192.in-addr.arpa.   3600   IN   PTR   www.example.com.
```

A PTR record should point to *one* name — the canonical name —
not to multiple names or to aliases. Many things break or behave
oddly when reverse-DNS returns multiple PTRs for one address;
mail acceptance systems in particular are picky about
forward-confirmed reverse DNS (FCrDNS), where `PTR(IP) = name` and
the name's `A`/`AAAA` resolves back to that same IP.

### TXT — arbitrary text

Holds opaque text strings. Originally meant for human-readable
metadata, now overloaded as the place every protocol publishes
its policy:

- **SPF** — `v=spf1 ip4:192.0.2.0/24 include:_spf.example.net -all`
- **DKIM** — `selector._domainkey.example.com TXT "v=DKIM1;
  k=rsa; p=MIIBIjANB..."`
- **DMARC** — `_dmarc.example.com TXT "v=DMARC1; p=reject;
  rua=mailto:dmarc@example.com"`
- **Domain-control verification** — `google-site-verification=...`,
  `MS=...`, `apple-domain-verification=...`, etc.
- **CA validation challenges** — `_acme-challenge.example.com.`
  used by Let's Encrypt and other ACME-based CAs.

A TXT record's RDATA is one or more character strings, each up to
255 bytes. Multiple strings in one record are concatenated by
parsers (some servers concatenate without a separator; others
preserve the separator — read the relevant RFC for the protocol
you're publishing).

### SRV — service location

Locates a host and port for a named service.

```
_sip._tcp.example.com.   3600   IN   SRV   10  60  5060  sip1.example.com.
_sip._tcp.example.com.   3600   IN   SRV   10  40  5060  sip2.example.com.
_sip._tcp.example.com.   3600   IN   SRV   20   0  5060  sip3.example.com.
```

Format: `_service._proto.name`. The values are *priority* (lower
preferred, like MX), *weight* (relative weighting among equal
priorities), *port*, and *target*. Used by SIP, XMPP, LDAP, Active
Directory, Kerberos, Minecraft, and a long tail of services that
want to abstract their port number from the consumer.

### CAA — Certification Authority Authorization

Tells public CAs which CAs are allowed to issue certificates for
your domain.

```
example.com.   3600   IN   CAA   0  issue       "letsencrypt.org"
example.com.   3600   IN   CAA   0  issue       "digicert.com"
example.com.   3600   IN   CAA   0  iodef       "mailto:security@example.com"
```

CAs are required (by the CA/Browser Forum baseline requirements) to
check CAA records and refuse issuance if the requested CA isn't
authorized. The first numeric field is a flag byte (0 or 128); the
second is the property tag (`issue`, `issuewild`, `iodef`); the
third is the value.

### Less common but useful records

- **DNAME** — like CNAME but for a whole subtree. A DNAME at
  `old.example.com.` pointing at `new.example.com.` makes
  `foo.old.example.com.` resolve as if it were `foo.new.example.com.`
  Useful for renaming subdomains.
- **NAPTR** — Naming Authority Pointer. Used in ENUM
  (telephone-number-to-URI) and a few other regex-based service
  discovery schemes.
- **TLSA** — DANE record. Pins TLS certificates by hash via DNS;
  needs DNSSEC to be useful.
- **SSHFP** — pins SSH host keys by hash; needs DNSSEC similarly.
- **OPENPGPKEY** — publishes an OpenPGP key by email address;
  niche.
- **HTTPS / SVCB** — modern records (RFC 9460) that let a client
  discover service parameters (`alpn`, `ipv4hint`, `ipv6hint`)
  before contacting the server. Replacing the historical use of
  CNAME at the apex for HTTP services in the long run.
- **DNSKEY, RRSIG, NSEC, NSEC3, DS** — DNSSEC plumbing. See the
  DNSSEC section.
- **TSIG** — transaction signature, used during zone transfers and
  dynamic updates; not a record you publish in zone files but a
  meta-record used between cooperating servers.

### TTL discipline

Every record has a TTL. The TTL on a record is the *maximum* time a
resolver may cache it; resolvers typically cache for the full TTL.
Choose TTLs based on how often the data changes and how quickly
changes need to propagate:

- 60–300 seconds — load balancers, frequently changing endpoints,
  failover targets. Pricey because every cache miss hits your
  authoritative servers.
- 3600 (1 hour) — sane default for most records.
- 86400 (1 day) — long-lived infrastructure (your own NS records,
  your zone's apex A/AAAA).
- 172800 (2 days) and up — `NS` records at the parent for your
  delegation, where you almost never want changes to propagate
  fast because you almost never make them.

The disciplined way to make a high-TTL change quickly is to lower
the TTL well in advance: change the TTL to (say) 300 seconds, wait
out the previous high TTL value worldwide (so all caches now have
the 300-second version), then make the actual change. Once the
change has stabilised, raise the TTL back to its long value.

---

## Zone files: master file format in detail

The format authoritative servers use to load zone data is the *master
file format* (sometimes called *zone file format*). It dates back to
the 1980s and is line-oriented, ASCII, and minimally structured.
Every authoritative DNS server can read it; many hosted DNS services
still let you import and export it.

### Anatomy of a zone file

```
; this is a comment from a semicolon to end of line
$TTL 1h
$ORIGIN example.com.

@        IN  SOA   ns1.example.com.  hostmaster.example.com. (
                    2025051601    ; serial
                    1h            ; refresh
                    15m           ; retry
                    2w            ; expire
                    1h            ; minimum/negative TTL
                    )
@        IN  NS    ns1.example.com.
@        IN  NS    ns2.example.com.

@        IN  MX    10  mail.example.com.
@        IN  A     192.0.2.10
@        IN  AAAA  2001:db8::10

www      IN  A     192.0.2.10
www      IN  AAAA  2001:db8::10

mail     IN  A     192.0.2.20
mail     IN  AAAA  2001:db8::20

api      IN  CNAME api-prod.example.net.

ns1      IN  A     192.0.2.2
ns2      IN  A     192.0.2.3

_acme-challenge   IN  TXT   "abc123abc123abc123"
```

Conventions and rules:

- **One record per line** (the SOA's parenthesised form spans
  multiple lines, but it's still one logical record).
- **Records start in column one.** Whitespace at the start of a
  line means "use the same name as the previous record" — see
  the section on the `@` and "ditto" rules below.
- **Comments** begin with `;` and run to the end of the line.
- **Strings** in TXT records are quoted with double quotes;
  embedded quotes are escaped with backslashes.
- **TTL** can be given on each record, but most zone files set a
  default with `$TTL` at the top and rely on it.
- **Class** is `IN` for everything you'll write in 2025; you can
  omit it.

### Control statements

The four `$` control statements (and their behaviour):

- `$TTL TIME` — the default TTL for any record below this line that
  doesn't specify its own. Required at the top of the file in
  modern zone files.
- `$ORIGIN NAME` — set the origin used when expanding relative
  names below this line. Use it when a single zone file contains
  records from multiple subdomains, although doing this is
  unusual.
- `$INCLUDE FILE [ORIGIN]` — splice another file in at this point.
  Useful for breaking a huge zone into manageable chunks.
- `$GENERATE RANGE LHS [TYPE] RHS` — BIND extension that produces
  a series of records. Often used to generate large reverse-zone
  PTR ranges:

  ```
  $GENERATE 1-254 $ PTR host-$.example.com.
  ```

  produces 254 PTR records for `1.example.com.` through
  `254.example.com.` (in the appropriate `in-addr.arpa.` zone).

### `@` and the "ditto" rule

`@` stands for the current `$ORIGIN`. Used most often on the SOA
and apex records:

```
@   IN  SOA  ns1.example.com.  hostmaster.example.com. ( … )
@   IN  NS   ns1.example.com.
@   IN  NS   ns2.example.com.
@   IN  A    192.0.2.10
```

A line that starts with whitespace inherits the name from the
previous record:

```
www      IN  A      192.0.2.10
         IN  A      192.0.2.11
         IN  AAAA   2001:db8::10
```

All three records belong to `www.example.com.`. This is the
classic compact form for multi-record names; whether to use it or
to repeat the name is a style choice. Repeating the name is more
verbose but more grep-friendly.

### Time-value syntax

Time fields (TTL, SOA refresh/retry/expire/min) accept either a
plain number of seconds or a number with a unit:

- `s` — seconds
- `m` — minutes
- `h` — hours
- `d` — days
- `w` — weeks

So `1h`, `60m`, and `3600` are equivalent. You can combine in
some implementations (`1h30m` = 5400 seconds).

### Trailing dots — once more, with feeling

The trailing-dot rule is so common as a source of bugs that it's
worth writing again:

- `mail.example.com.` (with the trailing dot) is *absolute*.
- `mail.example.com` (no trailing dot) is *relative to the current
  `$ORIGIN`*. If `$ORIGIN` is `example.com.`, this becomes
  `mail.example.com.example.com.`.
- A single label like `www` (with no dots at all) is also relative,
  but typically what you want — it becomes `www.example.com.`
  under the same origin.
- The MNAME and RNAME of an SOA record, and the targets of NS,
  MX, CNAME, PTR, and SRV records, all need to be either
  absolute (with the trailing dot) or short labels you intend to
  qualify.

If you ever see a record like `MX 10 mail.example.com` and the MX
target resolves to a name like `mail.example.com.example.com.`,
this is the bug you're looking at. `named-checkzone` will catch
the obvious cases (the MX target won't resolve to an A record).

### Reverse zone files

The forward and reverse zones are separate files with their own
SOAs. A reverse zone file might look like:

```
$TTL 1h
$ORIGIN 0.2.0.192.in-addr.arpa.

@   IN  SOA   ns1.example.com.  hostmaster.example.com. (
              2025051601 1h 15m 2w 1h
              )
@   IN  NS    ns1.example.com.
@   IN  NS    ns2.example.com.

10  IN  PTR   www.example.com.
11  IN  PTR   web2.example.com.
20  IN  PTR   mail.example.com.
21  IN  PTR   mail2.example.com.
```

Without `$ORIGIN`, you'd write the names out fully:

```
10.0.2.0.192.in-addr.arpa.   IN   PTR   www.example.com.
```

Most teams set `$ORIGIN` to the reverse zone and use the short
form. The PTR target (the right-hand side) is always a full,
absolute name with the trailing dot.

### Pre-flight: linting before pushing

```
named-checkconf /etc/named.conf
named-checkzone example.com /var/named/example.com.zone
```

These two commands catch the overwhelming majority of zone-file
bugs:

- Syntax errors (typos, missing fields).
- Unresolvable MX or NS targets within the zone.
- Records that fall outside the zone.
- Missing SOA or NS at the apex.
- Forgotten trailing dots that produce nonsense names.

Run them before every reload, ideally as a pre-commit hook on the
zone-files repository.

---

## BIND configuration

BIND is the reference open-source name server. The `named` daemon
reads `named.conf` at startup, loads its zones, and starts answering
queries. Most of what you'll do as an operator either edits a zone
file or edits `named.conf`. The configuration syntax is its own thing
— similar to C in superficial appearance, but with no relation to any
DNS standard.

### File layout

Common defaults vary by distribution but the shape is:

- `/etc/named.conf` (RHEL, CentOS, Fedora) or `/etc/bind/named.conf`
  (Debian, Ubuntu) — the main configuration.
- `/var/named/` (RHEL family) or `/var/cache/bind/` (Debian) — the
  working directory; zone files often live here, as do the
  serialized journal files (`*.jnl`) and statistics dumps.
- `/var/log/named/` — log files, if you've configured the logging
  channel to write to disk rather than syslog.
- `/etc/rndc.key` — TSIG key for `rndc` to talk to the server.

### Comments

Three syntaxes work, all equivalent:

```
/* C-style block comment */
// C++-style line comment
# shell-style line comment
```

### The basic statements

A `named.conf` is a sequence of *statements*. The ones you'll use
most:

- `options { ... }` — global options. Exactly one.
- `zone "NAME" IN { ... }` — declare a zone you serve. One per zone.
- `acl "NAME" { ... }` — define a named address match list.
- `key "NAME" { ... }` — declare a TSIG key.
- `controls { ... }` — configure the `rndc` control channel.
- `logging { ... }` — configure logging channels and categories.
- `view "NAME" { ... }` — split-horizon DNS (separate views of the
  same name to different clients).
- `server IP { ... }` — per-remote-server overrides.
- `include "FILE";` — splice another configuration file in.

### A minimal authoritative-only `named.conf`

```
options {
    directory       "/var/named";
    listen-on       { 127.0.0.1; 192.0.2.10; };
    listen-on-v6    { ::1; 2001:db8::10; };
    allow-query     { any; };
    recursion       no;
    version         "no";
    minimal-responses yes;
};

zone "example.com" IN {
    type primary;        # was "master" pre-BIND 9.16
    file "primary/example.com.zone";
    allow-transfer { 198.51.100.20; };   // ns2's IP
    also-notify    { 198.51.100.20; };
    notify         yes;
};

zone "0.2.0.192.in-addr.arpa" IN {
    type primary;
    file "primary/192.0.2.rev";
};

logging {
    channel main {
        file "/var/log/named/named.log" versions 3 size 10m;
        severity info;
        print-time     yes;
        print-category yes;
        print-severity yes;
    };
    category default { main; };
};
```

A few things to note about this skeleton:

- `recursion no` makes this server *authoritative-only* — it won't
  walk the tree on behalf of arbitrary clients. The modern best
  practice for any internet-facing authoritative server.
- `version "no"` doesn't actually set the version; it tells the
  server to refuse to disclose its version. Cosmetic but reduces
  fingerprinting.
- `minimal-responses yes` strips the `AUTHORITY` and `ADDITIONAL`
  sections from responses where they're not required, reducing
  payload size and amplification potential.
- `listen-on`/`listen-on-v6` restrict which interfaces the server
  binds to. Without these, BIND listens on all interfaces.
- The `notify` and `also-notify` statements inside the zone block
  are how the primary tells secondaries to refresh after a change.

### A minimal recursive resolver `named.conf`

```
options {
    directory       "/var/named";
    listen-on       { 127.0.0.1; 192.0.2.5; };
    listen-on-v6    { ::1; };
    allow-query     { localnets; };
    allow-recursion { localnets; };
    recursion       yes;
    forwarders      { 1.1.1.1; 8.8.8.8; };
    forward         first;
    dnssec-validation auto;
    minimal-responses yes;
};

zone "." IN {
    type hint;
    file "named.ca";   # the root hints file
};

zone "0.0.127.in-addr.arpa" IN {
    type primary;
    file "primary/127.0.0.zone";
};
```

Notes:

- `localnets` is a built-in ACL that matches any address on a
  network the server itself has an interface in. It's a cheap way
  to limit recursion to "the network this server is on".
- `forwarders` plus `forward first` makes this resolver use the
  upstream resolvers when possible but fall back to walking the
  tree itself if the forwarders fail. `forward only` is the
  alternative if you never want it to walk the tree.
- `dnssec-validation auto` turns on DNSSEC validation using the
  built-in trust anchors. With this on, the resolver will return
  `SERVFAIL` for DNSSEC-broken zones — which is correct behaviour
  but occasionally surprising when an external zone has botched
  its DNSSEC.

### Address match lists and ACLs

Many statements take an *address match list*. A match list is one
or more of:

- An IP address: `192.0.2.10`
- A network in CIDR: `192.0.2.0/24`
- The negation of any of the above: `!192.0.2.66`
- Another ACL by name: `localnets`, `localhost`, `any`, `none`,
  or any user-defined name
- A `key` reference: `key "tsig-name"` (so transfers/updates can be
  authorized by signature rather than IP)

Order matters; the first match wins.

```
acl "trusted" {
    127.0.0.1;
    ::1;
    192.0.2.0/24;
    !192.0.2.66;        // explicitly excluded inside the trusted block
};

options {
    allow-query     { trusted; };
    allow-recursion { trusted; };
};
```

### Zone types

- `primary` (or `master`) — this server holds the editable copy.
- `secondary` (or `slave`) — this server fetches a read-only copy
  from a primary via zone transfer.
- `hint` — used only for the root zone; the file lists the root
  servers' addresses, used to bootstrap the recursor's
  understanding of where to start a tree walk.
- `forward` — declares a zone whose queries should be forwarded to
  a specific set of servers, regardless of the global forwarders.
- `stub` — a partial copy of another zone's NS records, used when
  you want to be a slave for the *delegation* but not the data.
  Rare in modern setups.
- `static-stub`, `redirect`, `mirror` — newer specialised types,
  used in particular operational scenarios.

A secondary zone block looks like:

```
zone "example.com" IN {
    type secondary;
    masters { 192.0.2.10; };
    file "secondary/example.com.zone";
    allow-transfer { none; };       // unless you have tertiaries
};
```

Secondaries should `allow-transfer { none; }` unless they're
themselves serving as a master for further servers down the chain.

### NOTIFY and incremental zone transfers

When you change a zone on the primary and bump the SOA serial, the
primary sends a NOTIFY message to each name server listed in the
zone's NS records (and to anything in `also-notify`). On NOTIFY,
the secondary immediately polls the primary, compares serials, and
issues an *AXFR* (full zone transfer) or *IXFR* (incremental zone
transfer, RFC 1995) to fetch the new data.

IXFR exchanges only the records that have changed since the
secondary's last serial, which is dramatically more efficient on
large zones. Modern BIND uses IXFR by default if it can; if a
secondary's stored serial is too old or the journal has been
truncated, it falls back to AXFR.

`rndc reload` and `rndc reload ZONE` ask the server to re-read its
configuration / zone data; with NOTIFY plus IXFR, propagation to
secondaries is typically a few seconds.

### Operational tools

```
named-checkconf [-z] [/etc/named.conf]
    # validate the config; -z also tries to load every zone

named-checkzone example.com /var/named/example.com.zone
    # validate one zone file

rndc reload
rndc reload example.com
rndc reconfig
rndc retransfer example.com
rndc flush                 # clear the recursive cache
rndc flushname NAME        # clear one name from the recursive cache
rndc dumpdb -all           # dump the cache and zone data to a file
rndc dumpdb -cache         # cache only
rndc dumpdb -zones         # zones only
rndc stats                 # write statistics to a file
rndc status                # quick health summary
rndc trace [LEVEL]         # set debug level
rndc notrace               # turn off debug output
rndc querylog on           # log every query (expensive)
rndc querylog off
rndc stop                  # graceful shutdown
rndc halt                  # immediate shutdown without sync

systemctl status named
systemctl reload named
systemctl restart named
journalctl -u named -f
```

`rndc` talks to `named` over a control channel, authenticated by
a TSIG key in `/etc/rndc.key`. The control statement in the
config:

```
controls {
    inet 127.0.0.1 port 953
        allow { 127.0.0.1; }
        keys  { "rndc-key"; };
};

key "rndc-key" {
    algorithm hmac-sha256;
    secret "abcd1234...==";
};
```

`rndc-confgen` generates the key file. Distribution packages
typically set this up out of the box.

### Logging

The `logging` statement defines *channels* (where messages go) and
*categories* (which kinds of messages). Useful categories:

- `default` — anything not matched by another category.
- `general` — generic messages.
- `queries` — every query (loud; only enable when debugging).
- `query-errors` — only failed queries (useful in production).
- `client` — client connections.
- `network` — network-level events.
- `resolver` — recursive resolver activity.
- `xfer-in`, `xfer-out` — zone-transfer events.
- `notify` — NOTIFY messages.
- `update`, `update-security` — dynamic update events.
- `dnssec` — DNSSEC validation, signing, and key events.
- `lame-servers` — broken delegations the resolver has found.
- `security` — denied queries / transfers / updates.

Channels are file or syslog destinations with severity filters:

```
logging {
    channel security_log {
        file "/var/log/named/security.log" versions 5 size 5m;
        severity info;
        print-time     yes;
        print-severity yes;
        print-category yes;
    };
    channel xfer_log {
        file "/var/log/named/xfer.log" versions 5 size 5m;
        severity info;
        print-time yes;
    };

    category security  { security_log; };
    category xfer-in   { xfer_log; };
    category xfer-out  { xfer_log; };
    category notify    { xfer_log; };
};
```

### Views (split-horizon DNS)

Sometimes you want internal clients to see different DNS data than
external clients. BIND views let one server present different zone
contents based on who's asking.

```
view "internal" {
    match-clients { 192.0.2.0/24; };
    recursion yes;
    zone "example.com" IN {
        type primary;
        file "primary/example.com.internal";
    };
};

view "external" {
    match-clients { any; };
    recursion no;
    zone "example.com" IN {
        type primary;
        file "primary/example.com.external";
    };
};
```

`match-clients` is evaluated in declaration order; the first
matching view wins. Once views are in use, *every* zone must be
inside a view.

Views are powerful but operationally costly — you have two zone
files to keep consistent, two sets of records to update on changes,
two transfer relationships to manage. Modern alternatives include
hosting internal records in a separate, dedicated internal zone
(e.g. `example.internal.`) or using a DNS-aware split tunnel on the
client side.

### Forwarders revisited

Per-zone forwarding is configured with a `forward` zone:

```
zone "internal.corp." IN {
    type forward;
    forwarders { 10.0.0.5; 10.0.0.6; };
    forward only;
};
```

This is the common pattern when one zone lives on a different DNS
infrastructure (e.g. a Windows AD domain) but you want one resolver
endpoint for everything.

---

## Query tools: dig, host, nslookup, delv

You will spend more time staring at `dig` output than at any other
DNS tool. It's the operational gold standard: explicit, verbose, no
hidden behaviour, no platform variations worth worrying about. The
others are useful in narrower situations.

### dig

```
dig [@server] [domain] [type] [class] [+flags] [-options]
```

Defaults: query the resolver in `/etc/resolv.conf` for the `A`
record of the given name in the `IN` class.

#### Common forms

```
dig www.example.com                  # default A query, default resolver
dig www.example.com AAAA             # specifically IPv6 address
dig example.com MX
dig example.com NS
dig example.com SOA
dig example.com TXT
dig example.com ANY                  # all types (commonly filtered)
dig @8.8.8.8 example.com             # query a specific resolver
dig @ns1.example.com example.com SOA # ask the authoritative server directly
dig +short example.com               # just the answers, no headers
dig -x 192.0.2.10                    # reverse: ask for the PTR
dig +trace example.com               # walk from the root yourself
dig +tcp example.com                 # force TCP
dig +tries=1 +timeout=2 …            # don't retry, fail fast
dig -p 5353 @ns1.local example.com   # non-default port
dig -y key-name:secret example.com   # TSIG-signed query
```

#### Reading dig output

A typical `dig` output has four sections you actually care about,
plus some commentary at the top and bottom.

```
; <<>> DiG 9.18.x <<>> www.example.com
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 1232
;; QUESTION SECTION:
;www.example.com.    IN   A

;; ANSWER SECTION:
www.example.com.   300  IN   A   192.0.2.10
www.example.com.   300  IN   A   192.0.2.11

;; Query time: 18 msec
;; SERVER: 1.1.1.1#53(1.1.1.1)
;; WHEN: Sat May 17 09:22:13 PDT 2025
;; MSG SIZE  rcvd: 73
```

The pieces:

- **HEADER** line — opcode (`QUERY`, occasionally `UPDATE`),
  *status* (`NOERROR`, `NXDOMAIN`, `SERVFAIL`, `REFUSED`,
  `FORMERR`, `NOTIMP`, …), and a transaction ID.
- **flags** — `qr` (this is a response), `aa` (authoritative
  answer), `tc` (truncated), `rd` (recursion desired by client),
  `ra` (recursion available from server), `ad` (DNSSEC
  authenticated), `cd` (checking disabled — DNSSEC validation
  bypassed by client request).
- **counts** — how many records in each section.
- **OPT PSEUDOSECTION** — EDNS0 metadata.
- **QUESTION SECTION** — what was asked. Always one record.
- **ANSWER SECTION** — the real records, when there are any.
- **AUTHORITY SECTION** — the NS records for the zone the answer
  came from, or for the zone where the answer wasn't found.
- **ADDITIONAL SECTION** — extra records the server thought you
  might want (often glue, OPT pseudosection details, EDNS
  metadata).
- **Query time / SERVER / WHEN / MSG SIZE** — diagnostics.

#### Status codes you'll see

- **NOERROR** — the query succeeded. If the answer section is
  empty, that's "name exists, but has no records of the requested
  type" (NODATA).
- **NXDOMAIN** — the name doesn't exist.
- **SERVFAIL** — the server failed to produce an answer. Common
  causes: DNSSEC validation failure, broken authoritative server,
  recursion failure.
- **REFUSED** — the server is unwilling to answer (often
  recursion turned off for non-trusted clients, or a query for a
  zone the server isn't authoritative for and isn't recursing on
  behalf of you).
- **FORMERR** — the query was malformed. Almost always a tooling
  bug rather than something the user wrote.
- **NOTIMP** — the server doesn't implement the requested
  operation.

#### Useful +options

- `+short` — strip everything except the answer values.
- `+noall +answer` — same idea, slightly more readable for
  multi-record answers.
- `+nocmd` — suppress the leading "<<>> DiG …" version line.
- `+stats` — print the trailing stats block.
- `+nostats` — suppress it.
- `+trace` — perform an iterative resolution from the root,
  showing each delegation. Equivalent to walking the tree by hand.
- `+norecurse` — don't ask the server to recurse; useful when
  pinging an authoritative server with `@server` and you want to
  prove it answers authoritatively.
- `+dnssec` (or `+do`) — set the DO bit; ask for DNSSEC RRs.
- `+nodnssec` — clear it.
- `+cdflag` — set the CD (checking-disabled) bit; ask the resolver
  not to validate DNSSEC.
- `+adflag` — display the AD flag handling.
- `+nsid` — request the server's NSID (a server-identifier EDNS
  option, useful when the same anycast IP is many servers).
- `+subnet=CIDR` — send EDNS Client Subnet (RFC 7871). Useful when
  testing geo-aware DNS.
- `+bufsize=N` — UDP payload size to advertise via EDNS0.
- `+tcp` — force TCP.
- `+notcp` — disable fallback to TCP on truncation.
- `+retry=N`, `+tries=N`, `+timeout=S` — retry/timeout tuning.
- `+keepopen` — reuse one TCP connection across multiple queries on
  the same `dig` command line.

You can pass several names on one command line and `dig` will
query each in turn:

```
dig +noall +answer example.com mail.example.com www.example.com
```

#### Zone transfers with dig

```
dig @ns1.example.com example.com AXFR              # request a full zone transfer
dig @ns1.example.com example.com IXFR=2025051601   # incremental from this serial
```

This is a quick smoke-test for whether a server allows transfers
from your IP. Production transfers should always be authenticated
with TSIG.

#### Bulk lookups

```
dig -f names.txt +noall +answer
```

reads names from a file, one per line, and runs each query.
Combined with `xargs` and `awk`, useful for auditing thousands of
records.

### host

`host` is `dig` for the impatient — terse, sensible defaults,
nothing to read.

```
host example.com                 # A and AAAA
host -t MX example.com
host -t NS example.com
host -t TXT example.com
host -a example.com              # all (verbose) — shows every type the server returns
host -v example.com              # verbose; closer to dig output
host 192.0.2.10                  # reverse lookup
host example.com 1.1.1.1         # use a specific resolver
```

`host` is fine for one-line probes. For anything operational, use
`dig`.

### nslookup

`nslookup` is the historical Unix DNS tool, present on every
platform including Windows. It has two modes: command-line and
interactive.

```
nslookup example.com
nslookup -type=MX example.com
nslookup -type=NS example.com
nslookup example.com 8.8.8.8       # specific resolver

nslookup
> set type=mx
> example.com
> set type=ns
> example.com
> exit
```

Practical notes:

- `nslookup`'s output is not stable across implementations (BSD
  vs GNU vs Windows). Don't parse it in scripts.
- The `-` form on Windows / older Unix sometimes triggers an
  interactive mode if you forget the trailing query string.
- For modern operational work, prefer `dig` everywhere except
  Windows servers where you don't have BIND tools installed.
  Windows ships `Resolve-DnsName` in PowerShell, which is
  generally a better choice than `nslookup`.

### delv

`delv` ("Domain Entity Lookup & Validation") is a DNSSEC-aware
client. It does its own validation against the configured trust
anchors and tells you whether the answer is `fully validated`,
`partially validated`, or unvalidated. Use it to test whether a
zone's DNSSEC chain is intact.

```
delv www.example.com
delv +rtrace www.example.com           # show validation steps
delv +cd www.example.com               # disable validation
delv -a /etc/bind/bind.keys example.com
```

### kdig and drill

`kdig` ships with the Knot DNS toolkit; `drill` ships with
NSD/Unbound. Both are functionally similar to `dig` with slightly
different option flags. Worth knowing they exist; `dig` is fine
unless you have a specific reason to use one of these.

### Resolve-DnsName (PowerShell)

Modern Windows operators use `Resolve-DnsName` instead of
`nslookup`:

```powershell
Resolve-DnsName example.com
Resolve-DnsName example.com -Type MX
Resolve-DnsName example.com -Server 8.8.8.8
Resolve-DnsName example.com -DnssecOk
Resolve-DnsName -Name example.com -Type ANY -Server ns1.example.com
```

Returns objects, not text — pipeable to `Where-Object`,
`Select-Object`, etc.

### Network-level tooling for DNS troubleshooting

DNS lives on TCP and UDP port 53. Sometimes the answer to "DNS
isn't working" is at the network layer:

```
nc -uvz host 53                    # UDP port-knock
nc -vz  host 53                    # TCP port-knock
tcpdump -ni any port 53            # see DNS packets fly by
tcpdump -ni any port 53 -w dns.pcap  # capture for later analysis
tshark -ni any port 53             # decoded DNS traffic
ss -tnlp | grep :53                # what's listening locally?
ss -unlp | grep :53                # UDP listeners
```

Combine these with `dig +trace` and authoritative-server probes
(`dig @ns1 …`) to localise where the failure is happening.

---

## Operational tasks

These are the recipes you reach for repeatedly. Most are
"recipe-shaped" — same five steps every time, with the values
filled in.

### Add a record

1. Edit the zone file.
2. Bump the SOA serial. Always.
3. `named-checkzone ZONE FILE` to validate.
4. `rndc reload ZONE` (or `rndc reload` for everything).
5. `dig @LOCAL_NS NEW_NAME TYPE` to confirm the record is served.
6. After `notify` propagates, query each authoritative server
   listed in NS records: `dig @nsX NEW_NAME TYPE +short`.
7. Once all secondaries agree, you're done.

### Remove a record

Same process as add. The thing to watch is *whatever depends on
the record* — if any cache (yours, your customers', a CDN) still
holds a copy, the record will continue to resolve until the TTL
expires. To remove a record promptly, lower the TTL well in
advance:

1. Lower the TTL to (e.g.) 300 seconds. Bump SOA. Reload.
2. Wait for *more than* the previous TTL — every cache in the
   world that still has the old record now has the
   short-TTL version.
3. Remove the record. Bump SOA. Reload.
4. Within the new TTL, every cache will discard it.

### Move a service to a new IP

The "TTL game". Plan it in advance:

1. T-2 days: Lower the record's TTL to 300 (or whatever short
   value you can stand). Bump SOA. Reload. Verify the lowered
   TTL is what resolvers worldwide are now caching by querying
   external resolvers and watching the TTL count down to 300.
2. T-0: Change the record to the new IP. Bump SOA. Reload.
3. Watch the new IP receive traffic; watch the old IP empty out
   over the next 5 minutes.
4. Once traffic at the old IP is at zero, decommission it.
5. T+ a week: Raise the TTL back to its original value once
   you're confident no further changes are coming.

### Decommission a host

Remove every record that points to it (forward `A`/`AAAA`,
reverse `PTR`, any `MX` listing it, any `SRV` listing it) before
you turn the host off. Drop the TTLs first (TTL game above) so
caches expire promptly. Don't pull the host until DNS has caught
up; otherwise you'll have a window where queries succeed and
connections fail.

### Stand up a new secondary

1. On the new secondary, configure a `secondary` zone block
   pointing at the primary's IP, with the matching TSIG key if
   you're using one (you should be — see TSIG below).
2. On the primary, add the new secondary's IP to `allow-transfer`
   and `also-notify`.
3. Add the new secondary's hostname to the zone's NS records and
   bump the SOA serial.
4. `rndc reconfig` on both ends.
5. Watch the secondary log: it should issue an AXFR, then start
   responding.
6. Test with `dig @new-secondary ZONE SOA +norecurse` — you should
   see the same SOA serial as the primary.
7. Lastly, ask the parent zone's administrator to update the
   delegation NS records to include the new secondary. Until the
   delegation is updated, public traffic still won't reach the new
   secondary; but cache and existing zone-transfer subscribers will
   notice it.

### Retire a secondary

Reverse the above process. Remove the NS record, wait for
delegation TTL, remove from `allow-transfer` / `also-notify`,
shut down the secondary.

### Rotate a TSIG key

1. Generate a new key alongside the old.
2. Distribute the new key to both ends.
3. Configure both primary and secondary to accept *either* key
   (BIND supports multiple keys per server statement).
4. `rndc reconfig` both ends.
5. Verify zone transfers work using the new key (force one with
   `rndc retransfer`).
6. Remove the old key from both configurations.
7. `rndc reconfig` again.

### Force a zone transfer

```
rndc retransfer ZONE
```

on the secondary. The secondary contacts the primary and refetches
the zone. Useful when you've changed something the secondary
hasn't picked up; usually a sign that NOTIFY isn't reaching it
(firewall, IP mismatch in `also-notify`, etc.).

### Flush the cache (recursor)

```
rndc flush                # everything
rndc flushname EXAMPLE.com.
```

After fixing data on the authoritative side, this lets the
recursor re-fetch instead of waiting for TTL expiration.

### Inspect the cache

```
rndc dumpdb -cache /var/named/cache_dump.txt
less /var/named/cache_dump.txt
```

Useful for "is the bad answer in the cache, or is the upstream
giving me bad answers?".

### Check that all authoritatives agree

```
for ns in $(dig +short example.com NS); do
  echo "=== $ns ==="
  dig @"$ns" example.com SOA +short
  dig @"$ns" www.example.com +short
done
```

If the SOA serials disagree, you have a propagation problem — one
secondary is stale. Investigate NOTIFY and allow-transfer.

### Rolling out a new authoritative server while keeping uptime

1. Set up the new server as a secondary, fetching from your
   current primary.
2. Wait until it has the zone fully and is responding correctly.
3. Add it to the zone's NS records (so the parent zone learns
   about it).
4. Wait out the parent's delegation TTL.
5. Remove the old server from NS records, wait again, then turn
   it off.

This avoids any window where a queried name server is offline.

### The dangerous changes

A handful of operational changes have a long blast radius if you
get them wrong. Treat them with extra care:

- **Delegation changes.** Updating which name servers are
  authoritative for your zone with the parent. Wrong NS data
  here can take your domain offline for hours or days.
- **DNSSEC key rolls.** A botched roll can `SERVFAIL` your zone
  worldwide. Dry-run with a test zone first; let `dnssec-policy`
  manage the timing for you in modern BIND.
- **Apex record changes.** The apex is what most external
  consumers actually use; change windows here should respect TTLs
  on the order of 24h, not 1h.
- **Cutting a zone.** Splitting a zone into a parent + delegated
  child is more invasive than it looks; the new child needs its
  own NS records, the parent's records inside that subdomain need
  to move to the child, and the cut moment needs careful
  coordination.

---

## Security: TSIG, DNSSEC, and the threat model

DNS has two distinct security stories, addressing two different
threats.

**TSIG** authenticates *transactions between cooperating servers*.
It guarantees that a zone transfer or dynamic update came from the
expected source and wasn't tampered with in flight. The shared
secret means TSIG works only between servers that have already
exchanged keys out of band; it doesn't protect against an attacker
on the path between a client and a recursor, and it doesn't help an
arbitrary resolver verify that the answer it got from an
authoritative server is genuine.

**DNSSEC** authenticates *the data itself*, end to end, so that any
resolver — anywhere on the Internet — can prove cryptographically
that an answer it received originated from the zone owner and
wasn't modified in transit. DNSSEC defends against cache poisoning,
on-path tampering, and any other attempt to substitute false
answers. It does not protect query confidentiality (use DoT or DoH
for that) and it does not stop denial-of-service.

Production zones in 2025 typically use both: TSIG for
admin-to-admin and primary-to-secondary, DNSSEC for the public-
facing answers.

### TSIG — Transaction SIGnatures

TSIG (RFC 8945, originally 2845) attaches an HMAC to a DNS message,
keyed on a shared secret known to both ends.

#### Generating a key

```
tsig-keygen -a hmac-sha256 example-tsig > tsig.key
cat tsig.key
```

Output looks like:

```
key "example-tsig" {
    algorithm hmac-sha256;
    secret "abcd1234abcd1234abcd1234abcd1234abcd1234abcd==";
};
```

Keep this file readable only to root and the named user.

#### Using the key on the primary

```
include "/etc/bind/tsig.key";

zone "example.com" IN {
    type primary;
    file "primary/example.com.zone";
    allow-transfer { key "example-tsig"; };
    also-notify    { 198.51.100.20 key "example-tsig"; };
    notify yes;
};
```

Now the primary requires that any AXFR/IXFR request be
TSIG-signed with the named key. The IP-based `allow-transfer`
check is replaced (or augmented) by a cryptographic one — a
much stronger guarantee.

#### Using the key on the secondary

```
include "/etc/bind/tsig.key";

server 192.0.2.10 {
    keys { "example-tsig"; };
};

zone "example.com" IN {
    type secondary;
    masters { 192.0.2.10 key "example-tsig"; };
    file   "secondary/example.com.zone";
    allow-transfer { none; };
};
```

The `server` clause says "when talking to this IP, sign messages
with this key", and the `masters` clause restates it for clarity.

#### TSIG-signed dynamic updates

A separate use of TSIG: signing `nsupdate` messages so the
authoritative server will accept dynamic updates from authorized
clients only.

```
zone "example.com" IN {
    type primary;
    file "primary/example.com.zone";
    update-policy {
        grant updater-key zonesub *.example.com. A AAAA TXT;
    };
};
```

A client signs its update with the matching `updater-key`. See
"Dynamic updates" below.

#### TSIG errors

The `BADTIME` and `BADKEY` errors are common when a primary and
secondary's clocks are skewed too far apart (TSIG signatures have
a built-in time window) or when the keys disagree:

- **BADTIME** — clock skew exceeds the fudge factor (default 300s
  on each side). Run NTP/chrony.
- **BADKEY** — the signing key isn't recognised by the receiver.
- **BADSIG** — the signature didn't verify (data tampered, or
  wrong key on one side).

`tsig verify failure` in named's logs is one of these.

### DNSSEC — DNS Security Extensions

DNSSEC adds cryptographic signatures to every record set in a
zone, plus the metadata to walk a chain of trust from the root to
your zone. The pieces:

- **DNSKEY** — the public keys for the zone. There are two roles:
  the *Key Signing Key* (KSK), which signs DNSKEY RRsets, and the
  *Zone Signing Key* (ZSK), which signs everything else. The
  separation lets you roll ZSKs frequently and KSKs rarely.
- **RRSIG** — a signature record over each RRset.
- **NSEC** / **NSEC3** — proof of *non-existence*. When a name
  doesn't exist, the authoritative server returns an NSEC record
  saying "the names that do exist are X and Y, and the queried
  name falls between them, so it provably doesn't exist". NSEC3
  hashes the names to make zone enumeration harder.
- **DS** (Delegation Signer) — a hash of the child's KSK,
  published *in the parent zone*. This is the link in the chain
  of trust between parent and child.

A client validating a name follows the chain: root → TLD → your
zone, verifying signatures at each step. The root's keys are
configured as the *trust anchor* in resolvers like BIND
(`dnssec-validation auto`).

#### Signing a zone

Modern BIND uses `dnssec-policy` to manage the entire signing
lifecycle automatically. A minimal policy:

```
dnssec-policy "default" {
    keys {
        ksk lifetime unlimited algorithm 13;
        zsk lifetime P30D      algorithm 13;
    };
};

zone "example.com" IN {
    type primary;
    file "primary/example.com.zone";
    dnssec-policy "default";
    inline-signing yes;
};
```

`inline-signing yes` keeps an unsigned working copy of the zone
and lets BIND maintain the signed copy automatically. With
`dnssec-policy`, BIND generates keys, rolls them according to the
policy's lifetimes, and re-signs records before signatures
expire. You don't have to think about the details if you trust
the defaults.

The older, manual workflow (`dnssec-keygen`, `dnssec-signzone`)
still works but is worth replacing with `dnssec-policy` if you
can.

#### Bootstrapping the chain to the parent

After your zone is signed, the parent (your TLD or your
delegation provider) needs your DS record to complete the chain
of trust. Steps:

1. After signing, retrieve your DS record from your zone:

   ```
   dig @localhost example.com DS
   # or
   dnssec-dsfromkey -2 KSK_KEY_FILE
   ```

2. Submit that DS record to your registrar/parent. Most modern
   registrar control panels have a DNSSEC tab where you paste in
   the DS values.

3. Wait for the parent to publish the DS in their zone (delays
   vary; some are minutes, some are hours).

4. Validate end-to-end with a DNSSEC-aware resolver:

   ```
   delv example.com
   ```

   You should see `; fully validated` in the output.

#### Key rolls

A *KSK roll* changes the parent's DS record, and is therefore
more involved than a *ZSK roll* which changes only signatures
inside your zone. With `dnssec-policy`, BIND coordinates the
roll: it publishes the new key, waits the configured time for
old caches to expire, swaps the key in service, then retires the
old key. For KSK rolls specifically, an automated mechanism
called CDS/CDNSKEY (RFC 7344, RFC 8078) lets BIND publish the
new DS in your zone and have the parent automatically pick it
up. Most modern registrars support this; check yours.

#### When DNSSEC goes wrong

A misconfigured or expired DNSSEC zone returns SERVFAIL to
validating resolvers. Symptoms:

- Some users (those whose recursors validate) can't resolve your
  domain at all; others (whose recursors don't validate, or have
  CD set) work fine.
- `dig +dnssec` shows RRSIG records but the SERVFAIL still
  comes back when validation runs.
- `delv` shows the validation step that failed.

Common causes:

- The DS record at the parent doesn't match your KSK (you rolled
  but didn't update the parent).
- A signature expired (the `dnssec-policy` machinery wasn't
  running, or the zone was forgotten). RRSIGs have an expiry
  built in; if the signing daemon stops, your zone breaks
  silently after the longest signature lifetime.
- The chain of trust from the root has a break above you (rare,
  but newsworthy when it happens).

The emergency fix when your own DNSSEC has failed: turn off
DNSSEC on the zone (or, if you're a recursor and a critical
external zone is broken, turn on `dnssec-must-be-secure no` for
that zone, or use a "negative trust anchor" — `rndc managed-keys`
with appropriate options).

#### DANE and TLSA

A DNSSEC-secured benefit: you can publish a hash of your TLS
certificate in DNS via a TLSA record, and a DANE-aware client
will verify the certificate against that hash *before* trusting
the CA chain. This protects against rogue CAs. Not yet broadly
deployed, but the standard is mature.

```
_443._tcp.www.example.com. IN TLSA 3 1 1
   <SHA256 hash of cert>
```

### Other security hardening

- **Hide your version**: `version "no";` in `options`.
- **Refuse recursion** on authoritative servers: `recursion no;`.
- **Limit recursion** on resolvers: `allow-recursion { trusted; };`.
- **Rate limiting**: `rate-limit { responses-per-second 10; };` —
  blunt-instrument protection against DDoS amplification.
- **Run as a dedicated user**, not root.
- **Consider chroot**: older BIND packaging shipped a `bind-chroot`
  variant; modern systems with systemd sandboxing achieve similar
  isolation through unit-file directives.
- **Monitor**: SOA serial mismatches between primary and
  secondaries, SERVFAIL spikes, NXDOMAIN spikes (often
  reconnaissance), DNSSEC validation failures.
- **Patch promptly** when CVEs come out. BIND has a regular
  cadence of security advisories.

### Modern privacy: DoT, DoH, query minimisation

DNS queries are sent in cleartext on UDP/53 by default. Anyone on
the path can see what names you're resolving. Two transports
encrypt this:

- **DoT** (DNS-over-TLS, RFC 7858) — uses TCP/853.
- **DoH** (DNS-over-HTTPS, RFC 8484) — uses TCP/443.

Both protect the *stub-to-resolver* leg. The
*resolver-to-authoritative* leg is still cleartext in most
deployments, though there are RFCs (DoT to authoritative,
RFC 9103) addressing this. *Query name minimisation* (RFC 9156,
implemented in modern recursors) sends only the relevant label of
the query name to each authoritative server during a tree walk,
limiting how much information any single authoritative server
sees.

For an end-user resolver (laptop, phone), pointing at a DoH or
DoT-capable resolver like `1.1.1.1` is a no-cost privacy
improvement. For an enterprise resolver, DoT inside the
organisation plus regular DNS to authoritatives is a common
compromise.

---

## Troubleshooting recipes

The vast majority of DNS issues fall into a handful of patterns.
Knowing the patterns means recognising them in seconds rather than
debugging from first principles.

### "The site is down"

First, isolate whether DNS is the problem at all. Three quick
queries from the affected machine, in order:

```
dig +short example.com                          # answer from default resolver
dig +short example.com @8.8.8.8                 # answer from an external resolver
dig +short example.com @ns1.example.com         # answer straight from the authoritative
```

Outcomes:

- **All three agree, and the IP is reachable** → DNS is fine; the
  problem is at the application layer, the network, or the load
  balancer. Move on to `curl -vk https://...`, `nc`, `ping`.
- **All three agree, and the IP is not reachable** → DNS is fine;
  the problem is the host or its network.
- **Authoritative agrees with itself but external resolvers
  disagree** → propagation problem. The cache somewhere has stale
  data; wait out the TTL or, if it's your own resolver, flush.
- **Authoritative disagrees with itself across NS records** → one
  of your secondaries didn't pull the latest zone. Check the SOA
  serial on each NS:

  ```
  for ns in $(dig +short example.com NS); do
    s=$(dig +short @"$ns" example.com SOA | awk '{print $3}')
    echo "$ns -> serial $s"
  done
  ```

- **External resolver returns SERVFAIL** but the authoritative
  works → DNSSEC validation failure on the external resolver's
  side, OR an authoritative server is unreachable from that
  resolver's network.
- **Default resolver returns nothing** but `@ns1` works → your
  resolver is down, or a forwarder it depends on is down, or
  there's a path problem from your machine to the resolver.

### "The new record isn't visible"

```
dig +short newhost.example.com @ns1.example.com  # is it actually in the zone?
```

If yes:

- Check that all secondaries have the latest SOA serial:

  ```
  for ns in $(dig +short example.com NS); do
    dig @"$ns" example.com SOA +short
  done
  ```

- Wait out the TTL of the NXDOMAIN that was previously cached, or
  flush the local resolver:

  ```
  sudo systemd-resolve --flush-caches            # systemd-resolved
  sudo killall -HUP mDNSResponder                # macOS
  ipconfig /flushdns                             # Windows
  sudo rndc flush                                # local BIND recursor
  ```

  Browsers cache DNS independently of the OS — restart the
  browser, or test with `curl` to bypass the browser cache.

If the record isn't in the zone on the authoritative server, you
forgot to bump the SOA, didn't reload, or edited the wrong file.

### "DNSSEC says SERVFAIL"

```
dig +dnssec +cd example.com           # bypass validation
delv example.com                       # validating client
```

If `+cd` works and `delv` shows a chain failure, the DNSSEC chain
is broken. Common causes:

- The parent zone's DS record doesn't match your KSK (registrar
  not updated after a roll).
- Your zone's signatures expired (signing daemon stopped, or
  policy hasn't run).
- An RRset has been added that wasn't signed.

Look at the `delv` output for the specific failure. The fastest
fix is usually rolling the zone's keys forward (re-signing) and
re-publishing the DS to the parent.

### "Wrong server is answering"

The stub resolver is sending queries somewhere different from
where you think. Check:

```
cat /etc/resolv.conf
resolvectl status                  # systemd-resolved
networksetup -getdnsservers Wi-Fi  # macOS
```

Common causes:

- VPN client added a name server when connecting and didn't
  remove it cleanly.
- DHCP is overriding `/etc/resolv.conf`.
- macOS per-domain `/etc/resolver/` files are routing some names
  to a corporate resolver.
- The browser is using DoH directly to a public resolver,
  bypassing the OS.

### "The secondary won't pull the zone"

```
dig @primary-ip example.com AXFR         # try a transfer manually
```

`Transfer failed.` → check `allow-transfer` ACL on the primary,
TSIG keys on both ends, time skew if TSIG is in use, firewall
between primary and secondary on TCP/53.

```
journalctl -u named -f                    # both ends
tail -F /var/log/named/named.log
```

Look for `xfer-in:`, `xfer-out:`, `transfer of`, `notify`,
`refused`, and `bad signature` messages.

### "Why is this query slow?"

```
dig +stats example.com                    # see Query time
dig +trace example.com                    # see each step
```

A slow trace usually points at a slow upstream (root → TLD →
zone) or at a misconfigured authoritative server that's
timing-out on UDP and forcing TCP fallback. Use `dig +tcp` to
test that path independently.

### "Weird intermittent failures"

Several common patterns:

- **DNSSEC at the recursor is dropping responses too large for
  UDP and the path filters TCP/53.** Test with `dig +tcp`.
- **Anycast routing change**: queries that used to go to instance
  A now go to instance B, which doesn't have the same data
  (because zone replication isn't perfect). Use `+nsid` to
  identify which instance is answering.
- **One secondary out of N is stale**: queries that hit it return
  old data, queries that hit the others return new data.
- **EDNS firewall mishandling**: a firewall doesn't pass DNS
  packets larger than 512 bytes. Test with `dig +bufsize=512`
  vs `+bufsize=4096`.

### "Cache poisoning concern"

If you're worried someone is injecting forged answers into your
recursor:

- Run a DNSSEC-validating recursor (`dnssec-validation auto` or
  similar in your platform).
- Make sure your recursor uses random source ports for outbound
  queries (BIND has done this since 9.5; you almost certainly
  don't need to configure it).
- Restrict inbound queries to known clients
  (`allow-recursion`), or your recursor becomes the cache for
  the world *and* an open amplifier for DDoS.

### Useful one-liners for diagnosis

```
# Compare what every authoritative server returns for a name
for ns in $(dig +short example.com NS); do
  echo "== $ns =="
  dig @"$ns" www.example.com +short
done

# Walk the tree by hand
dig +trace +nodnssec example.com

# What's my recursor and what TTL is it caching?
dig www.example.com | head -20

# Strip everything except the answer
dig +short www.example.com

# Get the SOA serial of every NS for a zone
for ns in $(dig +short example.com NS); do
  printf '%-35s %s\n' "$ns" "$(dig @"$ns" example.com SOA +short)"
done

# Detect a misconfigured PTR (forward and reverse don't agree)
ip=$(dig +short www.example.com)
ptr=$(dig +short -x "$ip")
fwd=$(dig +short "$ptr")
echo "$ip -> $ptr -> $fwd"
# Should: $ip == $fwd. If not, you have a forward-confirmed-reverse-DNS bug.
```

---

## Dynamic updates

DNS records can be added, modified, or removed at runtime via
*dynamic update* (RFC 2136). The protocol uses an UPDATE opcode (as
opposed to QUERY) and is most commonly used for:

- DHCP servers updating PTR records as leases come and go.
- Active Directory clients registering themselves with the AD-DNS.
- ACME/DNS-01 certificate validation, where Certbot or similar
  briefly creates a `_acme-challenge` TXT record to prove control
  of the domain.
- Cloud automation that maintains records for ephemeral compute.

### Configuring a zone for updates

```
zone "example.com" IN {
    type primary;
    file "primary/example.com.zone";
    update-policy {
        grant updater-key zonesub * A AAAA TXT;
    };
    notify yes;
};

key "updater-key" {
    algorithm hmac-sha256;
    secret "abcd...==";
};
```

`update-policy` is more granular than the older `allow-update`
(which is purely IP-based). The `grant` syntax allows specifying
exactly what records the holder of a given key may change. The
`zonesub` qualifier limits updates to subdomains of the zone;
other qualifiers (`name`, `subdomain`, `wildcard`, `self`,
`selfsub`, `external`) constrain in different ways.

### Using `nsupdate` from the command line

```
nsupdate -k /etc/bind/updater.key
> server ns1.example.com
> zone example.com
> update add foo.example.com 300 A 192.0.2.99
> update add foo.example.com 300 AAAA 2001:db8::99
> send
> quit
```

To remove a record:

```
nsupdate -k /etc/bind/updater.key << EOF
server ns1.example.com
zone example.com
update delete foo.example.com A
send
EOF
```

To add and remove atomically (in one update message):

```
nsupdate -k /etc/bind/updater.key << EOF
server ns1.example.com
zone example.com
update delete foo.example.com A
update add foo.example.com 300 A 192.0.2.100
send
EOF
```

### When to use dynamic update

- **Yes** for DHCP-driven DNS, ACME challenges, ephemeral compute
  registration.
- **Maybe** for application-driven DNS (a deployment tool adding
  records as part of a release). Worth keeping the human-edited
  zones separate from the dynamically-updated ones — sub-zone
  delegation is common ("`dyn.example.com.` is for automation,
  everything else is hand-edited").
- **No** for one-off changes you'll forget about. Edit the zone
  file, bump the serial, reload — the audit trail is your VCS.

### `journal` files

When dynamic updates are in use, BIND maintains a `*.jnl` file
alongside the zone file. The journal records updates so they
survive a restart. Don't delete `.jnl` files casually — if they
get out of sync with the zone file, you may lose updates or
fail to start.

To safely "freeze" a zone for hand-editing:

```
rndc freeze ZONE             # stop accepting updates, flush journal to file
# edit the zone file
rndc thaw ZONE               # resume updates
```

This is the right way to make a one-off manual edit on a
dynamically-updated zone.

---

## Networking utilities you'll reach for alongside DNS

Sometimes the answer to "DNS isn't working" is "DNS is fine, the
network isn't". A small toolbox of networking utilities lives next
to `dig` in your operator brain.

### Reachability

```
ping -c 4 host                  # ICMP echo
ping6 host                      # IPv6 (or `ping -6`)
ping -c 4 1.1.1.1               # IP literal: bypass DNS entirely
fping -c 4 host1 host2 host3    # parallel
mtr host                        # interactive ping+traceroute (install separately)
mtr --report -c 50 host         # batch mode, useful in scripts
```

`mtr` is invaluable when you suspect a network path issue. It
shows per-hop loss and latency, and you can read the pattern in
the table: a single hop with high loss followed by clean hops is
that hop's problem; rising loss from a hop onward is everything
beyond that hop being affected.

### Path tracing

```
traceroute host                 # UDP-based by default on Linux
traceroute -T host              # TCP traceroute (firewalls often pass TCP/80)
traceroute -I host              # ICMP traceroute
traceroute -p 443 -T host       # specific TCP port
tcptraceroute host 443          # purpose-built TCP traceroute
```

Different probe types reach different paths because routers and
firewalls treat them differently. If UDP traceroute hits a black
hole at hop 4, try TCP — it might get further.

### Port reachability

```
nc -zv host 443                  # TCP port-knock
nc -uvz host 53                  # UDP port-knock (less reliable)
nc -lvp 9000                     # listen on TCP/9000 (test harness)
nmap -p 53,80,443 host           # multi-port scan
nmap -sU -p 53,123 host          # UDP scan
```

`nc -zv host 443` is the fastest way to answer "can I reach
this port from here?".

### Listening sockets

```
ss -tnlp                         # listening TCP sockets, with PIDs
ss -tnp                          # established TCP, with PIDs
ss -unlp                         # listening UDP, with PIDs
ss -unp                          # active UDP, with PIDs
ss -s                            # summary: counts of sockets
ss -tnp '( dport = :443 )'       # filter by port
netstat -tnlp                    # older alternative; ss is preferred
lsof -iTCP -sTCP:LISTEN          # everything listening on TCP
lsof -i :53                      # whatever is on port 53
```

`ss -tnlp | grep :53` answers "is `named` listening?".

### Local interfaces and routing

```
ip a                             # all interfaces and addresses
ip -br a                         # one-line-per-interface summary
ip r                             # routing table
ip route get 1.1.1.1             # which interface and gateway would be used
ip neigh                         # ARP / IPv6 neighbour cache
ip -s link                       # per-interface stats
ifconfig                         # legacy (Linux); still everywhere on macOS/BSD
arp -an                          # legacy (Linux); ip neigh on modern systems
```

`ip route get $IP` is the right tool to answer "if I send a
packet to this address, which interface does it leave on?".

### TLS and HTTPS

```
curl -vk https://host/path
curl --resolve host:443:1.2.3.4 -v https://host/path
                                 # use this IP, but pretend the SNI is host
openssl s_client -connect host:443 -servername host </dev/null 2>&1 | head
                                 # the full TLS handshake
openssl s_client -connect host:443 -showcerts </dev/null 2>&1
                                 # all the certs in the chain
nmap --script ssl-cert -p 443 host
```

`--resolve` is invaluable for testing a new endpoint *before*
you've cut DNS over to it: it lets `curl` connect to the new IP
while sending the right SNI/Host header, so the load balancer
routes correctly.

### Packet capture

```
tcpdump -ni any port 53                          # DNS, all interfaces
tcpdump -ni eth0 host 1.1.1.1                    # to/from a specific peer
tcpdump -ni any 'port 53 or port 853'            # DNS + DoT
tcpdump -ni any -w dns.pcap port 53              # save for later
tshark -ni any port 53                           # decoded DNS
tshark -nr dns.pcap -Y 'dns.flags.rcode != 0'    # filter packets in a saved capture
wireshark dns.pcap                               # GUI, the same data
```

A capture of one minute of port-53 traffic answers most "why is
DNS slow / failing" questions definitively.

### Connectivity tests for specific protocols

```
# SMTP banner
nc -v mail.example.com 25
openssl s_client -starttls smtp -connect mail.example.com:25

# IMAP
openssl s_client -connect imap.example.com:993

# SSH host key fingerprint
ssh-keyscan host
```

---

## Gotchas

A collection of foot-guns that catch experienced operators.

### Trailing dots

Already covered, but worth reiterating: a missing trailing dot in a
zone file appends `$ORIGIN` to your name, silently. Pre-flight every
zone change with `named-checkzone`. The places this bites hardest:

- The MNAME and RNAME of the SOA record.
- The target of NS, MX, CNAME, PTR, and SRV records.
- Anything you're copying from external documentation that uses
  the bare-name shortcut.

### Forgotten serial bumps

After `vim example.com.zone`, `rndc reload` will silently succeed
without re-publishing the change to secondaries if you didn't bump
the SOA serial. Symptom: primary serves new data, secondaries
serve old data. Fix: bump the serial to a higher value than the
last one served and reload again.

Since the serial is a 32-bit unsigned integer, any value works;
common conventions are `YYYYMMDDnn` (date plus two-digit revision)
or Unix epoch. Both make it obvious which serial is newest.

### Apex CNAMEs

Zone apex (the bare zone name) cannot be a CNAME. Period. If you
need an apex pointing at, say, a CDN's hostname, you have three
options:

- Use an `A`/`AAAA` record at the apex pointing at the CDN's IPs
  directly. Risky if the CDN's IPs change.
- Use a hosted DNS provider that offers an "ALIAS"/"ANAME"/
  "flattened CNAME" record. Their server resolves the target
  internally and serves an `A`/`AAAA` answer.
- Move the public-facing name to a non-apex name (e.g.
  `www.example.com.` instead of `example.com.`) and 301-redirect
  from the apex. This is the cleanest from a DNS-purist
  perspective.

### Glue records out of sync with reality

If the parent zone has glue (`A`/`AAAA` records for your name
servers) and you change the IPs, you must update both the glue
*and* the records inside your zone. The parent's glue is what
public resolvers actually use to find you; the records inside your
zone are what your zone says.

### "Lame" delegations

When the parent's NS records list a name server that doesn't know
about the zone (the secondary was retired without updating
delegation, or the new server hasn't been configured yet), that's
a *lame delegation*. Public resolvers eventually try every name
server in the delegation; some get unhelpful answers from the lame
ones. The symptom is occasional slow resolution of your domain.
Fix: keep delegation in sync with reality.

### Round-robin isn't load balancing

Multiple `A` records for one name are returned in (typically
rotated) order, but the client decides which to use. Most stub
resolvers use the first one, fall back to subsequent ones only on
connection failure. There's no health checking. For real load
balancing or HA, use a load balancer or a CDN.

### TTL planning takes time

You can't drop TTL from `86400` to `60` and expect the world to
have the new TTL within an hour. Resolvers that already have your
record cached will keep it for the *old* TTL. So if you're going
to make a change that depends on a short TTL, drop the TTL at
least one full TTL period in advance.

### Negative cache TTL bites you

If a name doesn't exist, the resolver caches the `NXDOMAIN` for
the SOA's negative TTL (the last field of the SOA). If you create
a new name and it doesn't immediately resolve everywhere, that's
because some resolvers are still in the negative-cache window.
Wait it out, or flush, or pre-emptively keep the negative TTL low
on zones where you'll be adding new names frequently.

### DNS over HTTPS bypasses your resolver

A laptop browsing the web on your network may bypass your
corporate resolver entirely, sending queries via DoH directly to
`dns.google` or `cloudflare-dns.com`. Effects: corporate
DNS-based filtering doesn't apply, split-horizon for internal
names doesn't work in the browser, and you can't see what names
are being queried. Mitigations: corporate-managed browsers can
disable DoH, or you can serve a "Canary domain" (RFC 8484) to
signal that DoH should be off, or you can implement DoH at your
own resolver and require its use.

### `127.0.0.1` and `::1` aren't symmetric

If your zone defines `localhost.example.com.` to point at
`127.0.0.1`, define an AAAA pointing at `::1` too. Otherwise
IPv6-preferring clients may try the v6 path, get NXDOMAIN, and
behave oddly.

### `/etc/hosts` short-circuits DNS

Don't forget that `/etc/hosts` (or
`C:\Windows\System32\drivers\etc\hosts`) can override DNS for
specific names. This is sometimes the cause of "weird local DNS
opinions". Always check it when "this one machine sees a different
answer than the others".

### IDN and Punycode

Internationalised domain names (`αβγ.example`) are encoded for DNS
as Punycode (`xn--mxac0bs.example`). Browsers do this automatically;
your zone file should contain the Punycode form. If you publish a
literal Unicode label, things will break.

### Browsers cache DNS independently

Restarting the browser, or testing with `curl`, is often necessary
to bypass the browser's DNS cache after fixing a record.

### CNAMEs in places they shouldn't be

- A CNAME on the same name as another record → illegal, will
  cause inconsistent answers.
- A CNAME at the zone apex → illegal.
- A CNAME as the target of an MX, NS, or PTR record → legal in
  the protocol but problematic in practice. Mail systems
  particularly may reject mail to MX targets that are CNAMEs.

### Expired DNSSEC signatures

RRSIG records have an expiry. If your signing daemon crashes and
nobody notices, your signatures will expire and your zone will
SERVFAIL for validating resolvers. Monitor signature expiry as a
proactive metric, not just as a reactive outage signal.

### Time skew breaks TSIG

TSIG signatures include a timestamp. If primary and secondary
clocks are off by more than the fudge factor (default 300s), zone
transfers fail with BADTIME. Run NTP on both ends.

### Zone transfer failures often look like configuration drift

If your secondary "isn't getting updates", check in this order:
NOTIFY (is the primary actually telling the secondary?),
`allow-transfer` ACL (does the primary let the secondary fetch?),
TSIG (do the keys match?), firewall (is TCP/53 open between
them?), reachability (`dig @primary . SOA`).

### Old `nslookup` lies

The output format of `nslookup` differs across implementations.
The fields that look like authoritative answers may actually be
cached answers. The fields labelled "Server:" tell you which
recursor was queried, not where the data came from. Use `dig` for
anything you'll need to interpret accurately.

---

## Version notes and ecosystem

### BIND versions in the wild

- **BIND 9.18 LTS** — current long-term support series. Stable,
  fully featured, what most modern Linux distributions ship.
- **BIND 9.16** — the previous LTS. End-of-life as of mid-2023;
  stragglers exist in long-running enterprise deployments.
- **BIND 9.11 and earlier** — explicitly out of support. If you're
  on these, the upgrade path is the most important task on your
  backlog. Older versions have unpatched CVEs.

The configuration syntax has been stable across recent versions;
the most visible changes:

- `master`/`slave` zone types have been deprecated in favour of
  `primary`/`secondary` (both still work).
- Manual DNSSEC management is being phased out in favour of
  `dnssec-policy`. Modern configurations should use the latter.
- `dnssec-must-be-secure` and a few other DNSSEC operator knobs
  have been refined.
- `geoip` ACLs use the MaxMind DB format (the older
  `geoip-directory` style was retired in 9.16).
- `serve-stale` (RFC 8767) is on by default in many configurations
  — return cached answers past TTL when authoritatives are
  unreachable, to keep the network usable during outages.

### Alternatives to BIND

- **Knot DNS** (CZ.NIC) — fast authoritative server, used heavily
  in TLDs. Comes with `kdig`.
- **NSD** (NLnet Labs) — minimalist authoritative server, used
  notably for the root zone's distributions.
- **Unbound** (NLnet Labs) — recursive-only resolver, lightweight
  and security-focused. Many modern setups pair Unbound (recursor)
  with NSD (authoritative).
- **PowerDNS** — separate authoritative and recursor packages,
  with database backends (so zone data lives in MySQL/Postgres
  rather than text files). Popular for hosted DNS.
- **CoreDNS** — DNS server written in Go; common in Kubernetes
  ecosystems as the in-cluster DNS.
- **systemd-resolved** — the default on most modern Linux
  desktops, a small recursive resolver glued into the systemd
  init system.
- **dnsmasq** — small server doing DHCP + DNS, common on home
  routers and embedded devices. Easy configuration, limited
  features.
- **Microsoft DNS Server** — bundled with Windows Server,
  AD-integrated. The default on most Windows-shop networks. Uses
  AD-replicated storage rather than zone files; can serve plain
  zones too.

The protocol is the same across all of them. Configuration
syntax differs, monitoring and operational tools differ, but the
zone data and the wire-protocol behaviour are interoperable.

### Hosted DNS providers

- **Route 53** (AWS) — feature-rich, integrated with AWS, supports
  alias records pointing at AWS resources.
- **Cloud DNS** (GCP) — similar story for Google Cloud.
- **Azure DNS** — for Azure.
- **Cloudflare** — popular, with extensive features for caching,
  DDoS protection, and integration with their other services.
  ANAME-style apex flattening included.
- **Constellix, NS1, DNSimple, Hurricane Electric, etc.** — smaller
  providers, each with their own feature mix.

The benefit is operational: you don't run name servers, you don't
worry about availability, you get a control panel and an API. The
cost is the lock-in (your DNS data lives in their proprietary
format, even if they accept zone-file imports/exports), and the
cost of egress queries (some charge per query, some flat).

### Modern best practices

- **Authoritative-only servers**, no recursion. Recursion belongs
  in dedicated recursive resolvers, not on your authoritative
  servers.
- **Multiple authoritative servers** in different networks (and
  ideally different providers). DNS-only outages take whole
  applications down.
- **DNSSEC** for any zone that holds public data. The chain of
  trust eliminates a wide class of cache-poisoning attacks.
- **Query-name minimisation** at recursors. Reduces information
  leakage to authoritative servers.
- **Monitoring**: SOA serial agreement across NS, response-time
  graphs from external probes, signature expiry alerts, NXDOMAIN
  spikes, SERVFAIL spikes, transfer-success metrics.
- **Version control your zone files**. Zone files live in git the
  same way infrastructure-as-code does. Pre-commit hooks run
  `named-checkzone`. CI pushes the validated files to the primary
  via SSH or your provider's API.
- **Separate zones for stable infrastructure and dynamic data**.
  ACME challenges, DHCP-driven PTRs, ephemeral compute should
  live in their own subzones (`dyn.example.com.`,
  `_acme-challenge.example.com.`) so the dynamically-updated
  data doesn't interfere with hand-edited records.
- **Secure transfers and updates with TSIG**, not IP-based ACLs
  alone.
- **Plan for IPv6**. AAAA records, IPv6-reachable name servers,
  reverse zones in `ip6.arpa.`, dual-stack everything.

### Useful RFCs

When you need the formal answer, the relevant RFCs are typically:

- **RFC 1034, 1035** — DNS concepts and protocol. The 1987
  originals; still authoritative.
- **RFC 2181** — clarifications on the DNS spec.
- **RFC 2308** — negative caching, repurposing of SOA minimum.
- **RFC 2845, 8945** — TSIG.
- **RFC 4033, 4034, 4035** — DNSSEC core.
- **RFC 5155** — NSEC3.
- **RFC 6891** — EDNS0.
- **RFC 7344, 8078** — automated DS publication for child zones.
- **RFC 7858** — DNS over TLS.
- **RFC 8484** — DNS over HTTPS.
- **RFC 8767** — serve-stale.
- **RFC 9156** — query name minimisation.
- **RFC 9460** — SVCB and HTTPS records.

For day-to-day work, you almost never need to read an RFC. For
debugging weird interop issues with another implementation,
sometimes nothing else will do.


---

## Recipe collection: programming against the resolver

Most ops work touches DNS through `dig`, `host`, or whatever the OS
gives you. When you need DNS *inside* an application — config
discovery, SRV-driven service location, custom health checks — you
reach for a resolver library. This section is a tour of the major
options and the gotchas that come up most.

### C — the system resolver

The classic C path is the libc resolver. The interesting calls live in
`<resolv.h>`:

- `res_init()` — initialise the resolver state from `/etc/resolv.conf`.
- `res_query()` / `res_search()` — issue a query, return the raw DNS
  response packet for you to parse.
- `getaddrinfo()` — the modern, protocol-agnostic name → socket
  lookup. Almost always what you want for "give me an address to
  connect to."
- `getnameinfo()` — the reverse: socket → name.

```c
#include <netdb.h>
#include <stdio.h>
#include <string.h>

int main(int argc, char **argv) {
    struct addrinfo hints = {0}, *res, *p;
    hints.ai_family = AF_UNSPEC;       // v4 or v6
    hints.ai_socktype = SOCK_STREAM;   // TCP

    int rc = getaddrinfo(argv[1], "https", &hints, &res);
    if (rc) { fprintf(stderr, "%s\n", gai_strerror(rc)); return 1; }

    for (p = res; p; p = p->ai_next) {
        char host[NI_MAXHOST];
        getnameinfo(p->ai_addr, p->ai_addrlen, host, sizeof host,
                    NULL, 0, NI_NUMERICHOST);
        printf("%s\n", host);
    }
    freeaddrinfo(res);
    return 0;
}
```

Gotchas worth memorising:

- `getaddrinfo` is the right call for almost all application code; the
  older `gethostbyname` / `gethostbyaddr` are not thread-safe and only
  speak IPv4.
- Always free the result with `freeaddrinfo`.
- Iteration order of the returned list is policy-driven (RFC 6724);
  don't assume it.
- `res_query` returns a raw DNS packet; if you want anything other
  than A/AAAA you are doing protocol-level work.

### C — `libldns` and `libunbound`

When you actually need to parse arbitrary record types, validate
DNSSEC, or do recursion yourself, the system resolver is too thin.
Two well-maintained C libraries:

- **`libldns`** (NLnet Labs) — high-level DNS protocol toolkit. Good
  at building, parsing, and signing zone data. The `drill` tool
  ships with it and is a useful debugging companion to `dig`.
- **`libunbound`** — embeddable validating recursive resolver. If you
  want to *do* DNSSEC validation inside your application without
  trusting the upstream resolver, this is the standard answer.

Both ship on most distros (`libldns-dev` / `libunbound-dev`).

### Perl, Python, Go, Rust — the modern picks

- **Perl**: `Net::DNS` — the long-lived workhorse. Builds and parses
  any record type, talks UDP/TCP/TLS, supports TSIG, DNSSEC.
- **Python**: `dnspython` (`pip install dnspython`). The de facto
  library; covers query, zone parsing, dynamic update, TSIG, DNSSEC.
- **Go**: `github.com/miekg/dns`. A near-complete DNS protocol
  implementation; used by CoreDNS internally.
- **Rust**: `hickory-dns` (formerly `trust-dns`). Async client +
  resolver + server crates.

The Python equivalent of the C example above:

```python
import dns.resolver

answers = dns.resolver.resolve("example.com", "A")
for r in answers:
    print(r.address)

# Specific record types
for r in dns.resolver.resolve("example.com", "MX"):
    print(r.preference, r.exchange)

# Use a specific server
r = dns.resolver.Resolver(configure=False)
r.nameservers = ["1.1.1.1", "9.9.9.9"]
r.timeout = 2
r.lifetime = 5
answers = r.resolve("example.com", "AAAA")
```

### Building queries by hand (when libraries get in the way)

When you need to test resolver behaviour or replay a pcap, you build
the wire format directly. Concise idioms:

```bash
# dig has a +qr mode that prints the wire format
dig +qr example.com any | grep -E '^;.*HEADER|;.*flags:'

# Construct an arbitrary query with kdig (knot-dnsutils)
kdig +retry=0 +tries=1 +timeout=2 @1.1.1.1 example.com TYPE65

# Send a question over a non-standard port
dig @127.0.0.1 -p 5353 example.com

# Force TCP
dig +tcp example.com

# Force EDNS off (test legacy paths)
dig +noedns example.com

# DNSSEC: ask for the records and the chain
dig +dnssec +cd example.com    # +cd disables validation client-side
delv example.com               # libldns's validator-aware lookup
```

---

## Recipe collection: less-common BIND configuration directives

A short reference for directives that show up rarely enough to forget
their exact spelling but are critical when you need them.

### Address-match-list and ACL composition

```
acl "internal" {
    127.0.0.1/32;
    10.0.0.0/8;
    192.168.0.0/16;
    fd00::/8;
};

acl "transfer-peers" { key "tsig-secondary"; };

options {
    allow-query        { internal; localhost; };
    allow-recursion    { internal; };
    allow-transfer     { transfer-peers; };
    allow-update       { none; };       # stop dynamic update by default
};
```

ACLs are evaluated top-to-bottom and the first match wins. `!` negates
an entry: `allow-query { !blocked; any; };` permits everyone except
the `blocked` ACL.

### Sortlist and address sorting

`sortlist` reorders the answer-section addresses on a per-client basis
to prefer "near" addresses. Largely superseded by client-side
`getaddrinfo` policy, but still useful in older environments:

```
options {
    sortlist {
        { 192.168.1.0/24; { 192.168.1.0/24; 10.0.0.0/8; }; };
    };
};
```

### Periodic intervals — when nameservers do work

```
options {
    cleaning-interval  60;     # cache cleaning, in minutes
    interface-interval 60;     # rescan interfaces
    statistics-interval 60;    # dump stats to log
    heartbeat-interval 60;     # dial-on-demand heartbeat (rare today)
    max-cache-ttl     86400;
    max-ncache-ttl    3600;
};
```

In modern environments leave the defaults alone unless you have a
specific reason. The values above are illustrative, not recommended.

### `trusted-keys` / `managed-keys` (DNSSEC)

The chain of DNSSEC trust starts with a key configured locally:

```
trusted-keys {
    "." 257 3 8 "AwEAA…";   # static trust anchor
};

# OR (recommended) — automatically tracked via RFC 5011
managed-keys {
    "." initial-key 257 3 8 "AwEAA…";
};
```

`managed-keys` is preferred because it follows root-zone key rollovers
without manual intervention.

### `check-names` — hostname validation

```
options {
    check-names master  fail;        # zone-load: refuse bad names
    check-names slave   warn;
    check-names response ignore;     # don't second-guess what we resolve
};
```

The defaults are usually fine; touch this only when an upstream is
serving names that your `master` strictness rejects.

### View clauses for split-horizon

```
view "internal" {
    match-clients { internal; };
    recursion yes;
    zone "corp.example.com" { type master; file "internal/corp.zone"; };
};

view "external" {
    match-clients { any; };
    recursion no;
    zone "corp.example.com" { type master; file "external/corp.zone"; };
};
```

Order matters: the first `view` whose `match-clients` matches the
query source wins. Put narrow ACLs first, `match-clients { any; };`
last.

### Logging channels

```
logging {
    channel "default_syslog" {
        syslog daemon;
        severity info;
    };
    channel "queries" {
        file "/var/log/named/queries.log" versions 5 size 100m;
        severity info;
        print-time yes;
    };
    category default  { default_syslog; };
    category queries  { queries; };
};
```

The `versions N size M` form does built-in log rotation. For
high-traffic resolvers, log rotation that BIND owns is generally
faster and more reliable than handing rotation to `logrotate`.

### `check_soa` and other operational scripts

Several SOA-comparison helpers ship with BIND in `contrib/`:

- `check_soa <zone>` — query each authoritative server for the zone
  and report SOA serial / mismatches.
- `nsdiff` (third-party) — diff two zones in dynamic-update form,
  ready to feed to `nsupdate`.
- `named-checkconf -z` — load-test every zone the config references.
- `named-checkzone <zone> <file>` — validate a single zone file.

Cron-style health check:

```bash
#!/usr/bin/env bash
set -euo pipefail
zone=corp.example.com
expected_serial=$(dig +short SOA @master.ns "$zone" | awk '{print $3}')
for ns in slave1.ns slave2.ns slave3.ns; do
    actual=$(dig +short SOA @"$ns" "$zone" | awk '{print $3}')
    [[ "$actual" == "$expected_serial" ]] || \
        echo "DRIFT: $ns serial=$actual master=$expected_serial"
done
```

### Miscellaneous record types worth knowing exist

| Type | Use |
| --- | --- |
| `AFSDB` | AFS database server location (legacy AFS / DCE) |
| `RP` | Responsible person (mostly cosmetic) |
| `LOC` | Geographic location (latitude/longitude) |
| `NAPTR` | Used by ENUM and SIP; pattern-substitution rules |
| `CERT` | Holds a certificate inline in DNS |
| `IPSECKEY` | Public key material for IPsec opportunistic encryption |
| `SSHFP` | SSH host-key fingerprint for verification at first connect |
| `TLSA` | DANE — bind a TLS cert to a DNS name |
| `SVCB` / `HTTPS` | Modern service binding; supersedes some SRV uses |
| `URI` | RFC 7553 URI record |

You will go your whole career without provisioning some of these. But
recognising them in `dig` output is its own skill.

### Avoiding common BIND pitfalls

- **Forgetting to bump the SOA serial after editing a zone.** Slaves
  won't pull the new data. `named-checkzone` will not catch this.
  Use `serial-update-method unixtime` or a wrapper script that
  bumps automatically.
- **Trailing-dot mistakes in zone files.** `host.example.com` with no
  trailing dot is parsed as `host.example.com.example.com.` —
  silently. Always use either fully-qualified-with-trailing-dot or
  bare-and-relative; never the in-between.
- **`$ORIGIN` reset by `$INCLUDE`**. Set `$ORIGIN` *after* an
  `$INCLUDE` if the included file changed it.
- **Slave fails after master IP change.** If `also-notify` and the
  slave's `masters {}` block both reference an old address, the
  zone goes stale; the symptom is a serial drift you can see with
  the `check_soa` recipe above.
- **DNSSEC chain breaks at parent.** If you re-sign with a new KSK
  but forget to push the DS record to the parent, every validating
  resolver returns SERVFAIL until the parent catches up.
