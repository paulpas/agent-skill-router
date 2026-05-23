---
name: stm32-embedded-systems
description: Implements STM32 firmware development using HAL/LL drivers, DMA peripheral
  programming, FreeRTOS task architecture, clock tree configuration, and power management
  for production embedded systems on Cortex-M microcontrollers.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: electrical-engineering
  triggers: STM32, embedded systems, firmware development, microcontroller programming,
    HAL driver, FreeRTOS on STM32, how do i program a microcontroller, clock tree
    configuration
  archetypes:
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - config
  - examples
  - diagrams
  related-skills: null
------

# STM32 Embedded Systems Programming

Implements production-quality firmware for STMicroelectronics STM32 microcontrollers (Cortex-M0/M3/M4/M7/M33) using HAL/LL drivers, DMA-based peripheral programming, FreeRTOS task architecture, clock tree configuration, and power management. Produces maintainable C code following IAR/ARM coding standards with hardware abstraction layer design patterns.

## TL;DR Checklist

- [ ] Configure clock tree in STM32CubeMX before writing any peripheral code
- [ ] Use DMA for all high-frequency data transfers (ADC sampling >1kHz, UART TX/RX)
- [ ] Set FreeRTOS stack sizes to at least 512 words (2KB) for tasks with float/double usage
- [ ] Enable ITM/SWO for printf output instead of blocking UART in debug builds
- [ ] Verify GPIO pin muxing matches the hardware schematic — never assume default pins
- [ ] Set NVIC priority grouping to 4 preemptive / 0 subpriority before enabling interrupts
- [ ] Test power mode transitions with a multimeter on actual hardware — simulation misses leakage

