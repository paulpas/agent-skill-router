---
name: go-configuration
description: Manages application configuration in Go with environment variables, YAML/JSON
  parsing, validation, defaults, and hierarchy for multi-environment deployments.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: go
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  triggers: go configuration, go config, go env vars, go yaml config, go config validation,
    go secret management
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: best-practices, cloud-development, deployment-patterns
  maturity: stable
  completeness: 95
  exampleCount: 3
---
# Go Configuration Management

Senior platform engineer implementing robust configuration management for Go applications. This skill covers environment variables, YAML/JSON parsing, validation, defaults, secret handling, and multi-environment configuration hierarchy.

## TL;DR Checklist

- [ ] Configuration is loaded into a struct — never access env vars directly in business logic
- [ ] Validation runs at load time — startup fails fast with a clear error message
- [ ] Defaults are explicit and documented in the struct tags or code
- [ ] Secrets are loaded from environment or a secrets manager — never from config files
- [ ] Configuration is immutable after loading — use a `*Config` pointer, not a struct with setters
- [ ] Multi-environment configs are merged: defaults → file → env vars → overrides

---

## When to Use

Use this skill when:

- Setting up configuration for a new Go application
- Migrating from hardcoded constants to externalized configuration
- Implementing multi-environment configuration (dev, staging, production)
- Adding configuration validation to prevent runtime failures
- Managing secrets (API keys, database passwords) securely

---

## When NOT to Use

Avoid this skill for:

- One-off scripts with no deployment concerns
- Applications that read configuration from a single source (e.g., only env vars)
- Embedded systems with fixed, unchangeable configuration

---

## Core Workflow

1. **Define the Configuration Struct** — Group related settings into logical structs.
   **Checkpoint:** Every field has a zero-value that is invalid — forces explicit loading.

2. **Implement Loading Logic** — Load from multiple sources in priority order.
   **Checkpoint:** Higher-priority sources override lower-priority ones.

3. **Validate Configuration** — Check all required fields and valid ranges at load time.
   **Checkpoint:** Invalid config causes immediate startup failure with a descriptive error.

4. **Handle Secrets Separately** — Load secrets from environment or secrets manager only.
   **Checkpoint:** No secrets in config files, logs, or error messages.

5. **Make Configuration Immutable** — Return a `*Config` pointer after loading — no setters.
   **Checkpoint:** Configuration cannot be modified after `LoadConfig()` returns.

---

## Implementation Patterns

### Pattern 1: Configuration Loading with Hierarchy (❌ BAD vs ✅ GOOD)

Configuration should load from a well-defined hierarchy with validation.

#### ❌ BAD — Hardcoded and Environment-Only

```go
// ❌ BAD: configuration scattered across the codebase
package main

var (
	dbHost     = "localhost" // hardcoded default — no validation
	dbPort     = 5432       // magic number
	dbName     = "myapp"    // hardcoded
	apiKey     = os.Getenv("API_KEY") // nil if not set — no error
	logLevel   = os.Getenv("LOG_LEVEL") // "debug" if not set — no validation
	maxRetries = 3          // magic number
)

func main() {
	// No validation — invalid config causes runtime failures
	runServer()
}

func runServer() {
	// Business logic depends on global vars — impossible to test independently
	connStr := fmt.Sprintf("postgres://%s:%d/%s", dbHost, dbPort, dbName)
	// ...
}
```

**What's wrong:**
- Configuration is global mutable state — race conditions, impossible to test
- Hardcoded defaults are not documented — new developers don't know what they are
- `os.Getenv` returns empty string if not set — no error, no validation
- No validation — `LOG_LEVEL = "blah"` is accepted
- No hierarchy — can't load from a file AND override with env vars

#### ✅ GOOD: Structured Configuration with Hierarchy

```go
// package: config

// Config holds all application configuration.
// Zero values are invalid — all fields must be explicitly loaded.
type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Logging  LoggingConfig
	API      APIConfig
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Addr    string        `mapstructure:"addr"`
	Port    int           `mapstructure:"port"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

// DatabaseConfig holds database connection settings.
type DatabaseConfig struct {
	DSN        string `mapstructure:"dsn"`
	MaxOpenConns int  `mapstructure:"max_open_conns"`
	MaxIdleConns int  `mapstructure:"max_idle_conns"`
}

// LoggingConfig holds logging configuration.
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // "json" or "text"
}

// APIConfig holds external API configuration.
type APIConfig struct {
	BaseURL  string `mapstructure:"base_url"`
	APIKey   string `mapstructure:"api_key"` // secret — only from env
	Timeout  time.Duration `mapstructure:"timeout"`
	MaxRetries int   `mapstructure:"max_retries"`
}

// LoadConfig loads configuration from a file and environment variables.
// Priority: file < environment variables.
// Returns an error if required fields are missing or invalid.
func LoadConfig(cfgFile string) (*Config, error) {
	v := viper.New()

	// Set defaults
	v.SetDefault("server.addr", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", 15*time.Second)
	v.SetDefault("server.write_timeout", 30*time.Second)
	v.SetDefault("server.idle_timeout", 120*time.Second)
	v.SetDefault("database.max_open_conns", 25)
	v.SetDefault("database.max_idle_conns", 10)
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")
	v.SetDefault("api.timeout", 30*time.Second)
	v.SetDefault("api.max_retries", 3)

	// Configure file loading
	if cfgFile != "" {
		v.SetConfigFile(cfgFile)
	} else {
		v.SetConfigName("config")
		v.SetConfigType("yaml")
		v.AddConfigPath("/etc/myapp")
		v.AddConfigPath("$HOME/.myapp")
		v.AddConfigPath(".")
	}

	// Read config file (ignore "not found" — file is optional)
	if err := v.ReadInConfig(); err != nil {
		if !errors.As(err, &viper.ConfigFileNotFoundError{}) {
			return nil, fmt.Errorf("read config file: %w", err)
		}
	}

	// Environment variable overrides
	v.AutomaticEnv()
	v.SetEnvPrefix("APP")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

	// Bind environment variables to config keys
	v.BindEnv("server.addr", "SERVER_ADDR")
	v.BindEnv("server.port", "SERVER_PORT")
	v.BindEnv("database.dsn", "DATABASE_URL")
	v.BindEnv("api.api_key", "API_KEY") // secret — only from env
	v.BindEnv("logging.level", "LOG_LEVEL")
	v.BindEnv("logging.format", "LOG_FORMAT")

	// Decode into struct
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	// Validate
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("validate config: %w", err)
	}

	return &cfg, nil
}

// Validate checks that all required configuration is present and valid.
func (c *Config) Validate() error {
	var errs []error

	// Server validation
	if c.Server.Port < 1 || c.Server.Port > 65535 {
		errs = append(errs, fmt.Errorf("server.port must be 1-65535, got %d", c.Server.Port))
	}

	// Database validation
	if c.Database.DSN == "" {
		errs = append(errs, errors.New("database.dsn is required"))
	}
	if c.Database.MaxOpenConns < 1 {
		errs = append(errs, errors.New("database.max_open_conns must be >= 1"))
	}

	// Logging validation
	switch c.Logging.Level {
	case "debug", "info", "warn", "error", "fatal":
	default:
		errs = append(errs, fmt.Errorf("logging.level must be one of: debug, info, warn, error, fatal; got %q", c.Logging.Level))
	}
	if c.Logging.Format != "json" && c.Logging.Format != "text" {
		errs = append(errs, fmt.Errorf("logging.format must be 'json' or 'text'; got %q", c.Logging.Format))
	}

	// API validation
	if c.API.APIKey == "" {
		errs = append(errs, errors.New("api.api_key is required (set via APP_API_KEY env var)"))
	}

	if len(errs) > 0 {
		return multiError(errs)
	}
	return nil
}

// multiError collects multiple validation errors into one.
type multiError []error

func (e multiError) Error() string {
	var msgs []string
	for _, err := range e {
		msgs = append(msgs, err.Error())
	}
	return strings.Join(msgs, "; ")
}
```

**Why this works:**
- `viper` handles file loading + env var merging automatically
- `SetEnvPrefix("APP")` means `SERVER_PORT` becomes `APP_SERVER_PORT`
- `SetEnvKeyReplacer` maps dots to underscores (`server.addr` → `SERVER_ADDR`)
- File is optional — env vars always take priority
- `Validate()` checks all fields at load time — startup fails fast
- `*Config` is immutable — no public setters

---

### Pattern 2: Secret Management (❌ BAD vs ✅ GOOD)

Secrets should never come from config files — only from environment or a secrets manager.

#### ❌ BAD — Secrets in Config Files

```yaml
# ❌ BAD: secrets in a YAML config file — committed to git by accident
server:
  addr: "0.0.0.0"
  port: 8080
database:
  dsn: "postgres://admin:SuperSecret123!@db.example.com:5432/myapp"
api:
  api_key: "sk-proj-abc123def456ghi789"
  secret: "whK3mP9xR2vL8nQ1"
```

**What's wrong:**
- Database password in plaintext — if committed to git, it's exposed forever
- API key in config — rotated keys require updating config files
- No separation between config and secrets — both are in the same file
- Secrets appear in logs if config is printed
- Rotation requires redeploying the entire config

#### ✅ GOOD — Secrets from Environment Only

```go
// package: config

// LoadSecrets loads secrets from environment variables.
// Secrets are NEVER loaded from config files.
func LoadSecrets() (*Secrets, error) {
	s := &Secrets{}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	s.DSN = dsn

	apiKey := os.Getenv("API_KEY")
	if apiKey == "" {
		return nil, errors.New("API_KEY is required")
	}
	s.APIKey = apiKey

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	s.JWTSecret = secret

	return s, nil
}

// Secrets holds sensitive configuration values.
// Zero values are invalid — all fields must be loaded.
type Secrets struct {
	DSN       string
	APIKey    string
	JWTSecret string
}

// DSNWithPassword returns the database DSN with the password masked.
func (s *Secrets) DSNMasked() string {
	// Replace password with "***" for logging
	masked := s.DSN
	if idx := strings.Index(masked, "://"); idx != -1 {
		if after := masked[idx+3:]; strings.Contains(after, "@") {
			parts := strings.SplitN(after, "@", 2)
			masked = masked[:idx+3] + "***@" + parts[1]
		}
	}
	return masked
}

// package: main

func main() {
	// Load configuration (non-sensitive settings)
	cfg, err := config.LoadConfig("config.yaml")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// Load secrets separately (only from environment or secrets manager)
	secrets, err := config.LoadSecrets()
	if err != nil {
		log.Fatalf("load secrets: %v", err)
	}

	// Log masked config for debugging
	log.Printf("starting with config: %s", secrets.DSNMasked())

	// Use cfg and secrets together
	svc := NewService(cfg, secrets)
	svc.Run()
}
```

**Why this works:**
- Secrets are loaded from environment only — never from config files
- `DATABASE_URL`, `API_KEY`, `JWT_SECRET` are standard env var conventions
- `DSNMasked()` safely displays connection strings in logs
- Secrets struct is separate from Config — different handling, different security
- Rotation is simple: update the environment variable, no file changes needed

---

### Pattern 3: Configuration as Code (❌ BAD vs ✅ GOOD)

Configuration should be self-documenting with clear defaults and validation.

#### ❌ BAD — Undocumented Configuration

```go
// ❌ BAD: no documentation of what configuration options exist
type Config struct {
	A string
	B int
	C bool
	D string
}

func Load() *Config {
	return &Config{
		A: "x",
		B: 42,
		C: true,
		D: "z",
	}
}
```

**What's wrong:**
- Field names `A`, `B`, `C`, `D` are meaningless — no documentation
- Defaults are magic numbers — no explanation of what they mean
- No validation — any value is accepted
- No env var binding — configuration can't be changed without code changes
- New developers can't understand what each field controls

#### ✅ GOOD — Self-Documenting Configuration

```go
// package: config

// Config holds all application settings.
// Each field has an associated environment variable and a documented default.
type Config struct {
	// Server settings
	Server ServerConfig

	// Database settings
	Database DatabaseConfig

	// Logging settings
	Logging LoggingConfig
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	// Addr is the network interface to listen on.
	// Env: SERVER_ADDR
	// Default: "0.0.0.0"
	Addr string

	// Port is the TCP port to listen on.
	// Env: SERVER_PORT
	// Default: 8080
	// Range: 1-65535
	Port int

	// ReadTimeout is the maximum duration for reading the entire request,
	// including the body.
	// Env: SERVER_READ_TIMEOUT
	// Default: "15s"
	ReadTimeout time.Duration

	// WriteTimeout is the maximum duration before timing out writes.
	// Env: SERVER_WRITE_TIMEOUT
	// Default: "30s"
	WriteTimeout time.Duration

	// IdleTimeout is the maximum amount of time to wait for the next request.
	// Env: SERVER_IDLE_TIMEOUT
	// Default: "120s"
	IdleTimeout time.Duration
}

// DatabaseConfig holds database connection settings.
type DatabaseConfig struct {
	// DSN is the PostgreSQL connection string.
	// Env: DATABASE_URL
	// Required: true
	DSN string

	// MaxOpenConns is the maximum number of open connections to the database.
	// Env: DB_MAX_OPEN_CONNS
	// Default: 25
	MaxOpenConns int

	// MaxIdleConns is the maximum number of idle connections to the database.
	// Env: DB_MAX_IDLE_CONNS
	// Default: 10
	MaxIdleConns int
}

// LoggingConfig holds logging settings.
type LoggingConfig struct {
	// Level is the minimum log level.
	// Env: LOG_LEVEL
	// Default: "info"
	// Values: debug, info, warn, error, fatal
	Level string

	// Format is the log output format.
	// Env: LOG_FORMAT
	// Default: "json"
	// Values: json, text
	Format string
}

// DefaultConfig returns a Config with all defaults set.
// Use this as a starting point before merging with file/env configuration.
func DefaultConfig() *Config {
	return &Config{
		Server: ServerConfig{
			Addr:         "0.0.0.0",
			Port:         8080,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 30 * time.Second,
			IdleTimeout:  120 * time.Second,
		},
		Database: DatabaseConfig{
			MaxOpenConns: 25,
			MaxIdleConns: 10,
		},
		Logging: LoggingConfig{
			Level:  "info",
			Format: "json",
		},
	}
}
```

**Why this works:**
- Every field has a godoc comment explaining its purpose and default value
- `// Env:` comment documents the environment variable name
- `// Default:` comment documents the default value
- `// Range:` and `// Values:` document valid ranges and accepted values
- `DefaultConfig()` provides a clear starting point for merging
- New developers can understand the configuration just by reading the struct

---

## Constraints

### MUST DO

- **MUST** load configuration into a struct — never access `os.Getenv` directly in business logic
- **MUST** validate all required fields at load time — fail fast with a descriptive error
- **MUST** load secrets from environment variables or a secrets manager — never from config files
- **MUST** document every configuration field with its purpose, env var name, and default value
- **MUST** make configuration immutable after loading — no public setters
- **MUST** use a configuration hierarchy: defaults → file → env vars → overrides

### MUST NOT DO

- **MUST NOT** store secrets in config files (YAML, JSON, .env, etc.)
- **MUST NOT** log secrets or passwords — always mask them
- **MUST NOT** use global variables for configuration — pass `*Config` as a dependency
- **MUST NOT** accept invalid configuration without validation — always validate at load time
- **MUST NOT** use `os.Getenv` directly in business logic — always use the `Config` struct
- **MUST NOT** commit configuration files containing secrets to version control

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `best-practices` | Go idioms, naming, and code organization |
| `cloud-development` | Cloud-native configuration with Kubernetes ConfigMaps and Secrets |
| `deployment-patterns` | Configuration in containerized environments |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Viper Configuration Package](https://pkg.go.dev/github.com/spf13/viper)
- [Go Config File Patterns](https://pkg.go.dev/github.com/spf13/cobra)
- [Environment Variables in Go](https://pkg.go.dev/os#Environ)
- [YAML Parsing in Go](https://pkg.go.dev/gopkg.in/yaml.v3)
- [Go Configuration Best Practices](https://12factor.net/config)
