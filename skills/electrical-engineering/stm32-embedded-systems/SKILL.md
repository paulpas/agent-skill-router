---




name: stm32-embedded-systems
description: Implements STM32 firmware development using HAL/LL drivers, DMA peripheral
  programming, FreeRTOS task architecture, clock tree configuration, and power management
  for production embedded systems on Cortex-M microcontrollers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
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




---




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

---

## When to Use

- Developing firmware for STM32 Cortex-M microcontrollers (F1, F4, L4, H7, G0, WB series)
- Configuring clock trees, PLL settings, and system clock sources in STM32CubeMX
- Programming peripherals using HAL/LL drivers: GPIO, UART (DMA), SPI, I2C, ADC (DMA), Timers, DMA
- Integrating FreeRTOS with STM32 HAL: task creation, queue communication, semaphore synchronization, memory allocation
- Designing firmware architecture with hardware abstraction layers for testability
- Implementing low-power modes (Sleep, Stop, Standby) with wake-up source configuration
- Debugging embedded firmware using SWD/JTAG, ST-Link utilities, OpenOCD, and logic analyzers
- Migrating from direct register access to HAL or LL drivers for new development

---

## When NOT to Use

- For ARM Cortex-A application processors (use Linux/embedded Linux skills instead)
- For non-ST microcontrollers like ESP32, nRF52, or PIC — use the appropriate MCU-specific skill
- For FPGA/Verilog/VHDL designs — this is a microcontroller firmware skill only
- For pure hardware design (schematic capture, PCB layout) — no embedded code applies

---

## Core Workflow

### Phase 1: Project Setup and Clock Configuration

1. **Select the STM32 device** — Open STM32CubeMX, load the correct part number from ST's database.
   **Checkpoint:** Verify the package type (LQFP-64 vs WLCSP-40), voltage range, and temperature grade match your board. Wrong device selection causes runtime failures.

2. **Configure clock tree** — Set HSE crystal frequency (typically 8MHz), enable PLL, select SYSCLK source.
   - F1 series: SYSCLK max 72MHz (PLL from HSE × multiplier)
   - F4/H7 series: SYSCLK up to 180-480MHz with complex PLL1/PLL2 configuration
   - L4 series: use MSI or HSE with PLL, supports up to 80MHz
   **Checkpoint:** All bus clocks (AHB, APB1, APB2) must be within spec for each peripheral. Check the Reference Manual clock timing table.

3. **Enable debug mode** — Set SYS → Debug to Serial Wire (SWD) before generating code. SWO/ITM can be enabled separately for trace output.
   **Checkpoint:** If debug is not enabled, the device becomes unflashable and you must perform a mass erase via ST-Link utility.

4. **Configure GPIO pins** — Set pin directions, modes (analog, input floating, pull-up/down), and alternate function mappings.
   - UART TX → Alternate Function Open Drain
   - ADC pins → Analog mode (no digital buffer)
   - I2C SDA/SCL → Alternate Function Open Drain with internal pull-up
   **Checkpoint:** Cross-reference every pin assignment against the hardware schematic.

5. **Configure peripherals** — Enable UART, SPI, I2C, ADC, Timer modules with correct parameters.
   - UART: baud rate, 8N1, enable RX/TX DMA channels
   - SPI: clock polarity/phase (CPOL/CPHA), data size 8-bit, software NSS or hardware pin
   - I2C: standard/fast mode, own address if acting as slave
   - ADC: resolution (12-bit), sampling time per channel, scan vs continuous mode
   **Checkpoint:** DMA stream/channel assignments must match the device reference manual — each peripheral maps to specific DMA streams.

6. **Configure FreeRTOS** — If using RTOS: set tick rate (1000Hz typical), enable queue storage space, configure heap selection (Heap_4 or Heap_5 for fragmented allocation).
   **Checkpoint:** Stack overflow protection (`configCHECK_FOR_STACK_OVERFLOW`) must be enabled in production builds.

7. **Generate code** — Click Generate Code, then import into STM32CubeIDE or PlatformIO. Do not modify `main.c` directly — extend with user code sections.
   **Checkpoint:** After code generation, verify `MX_Init()` calls in correct order in `main()`. CubeMX generates initialization in declaration order unless manually reordered.

### Phase 2: Firmware Implementation

8. **Implement hardware abstraction layer (HAL)** — Create thin wrapper functions around HAL calls for your specific board. This abstracts the ST library and enables unit testing of application logic.
   **Checkpoint:** Every HAL call should be wrapped. Never reference `HAL_GPIO_WritePin()` directly in application code.

9. **Write FreeRTOS tasks** — Implement each system function as an independent task with appropriate priority, stack size, and sleep duration.
   **Checkpoint:** Highest priority must NOT starve lower priority tasks — include `osDelay()` or block on queues/semaphores.

10. **Integrate peripheral drivers** — Use DMA-based transfers where applicable. Never use blocking HAL calls in RTOS tasks that need responsive behavior.
    **Checkpoint:** Verify DMA transfer complete callbacks are registered with `HAL_DMA_RegisterCallback()`.

### Phase 3: Power and Optimization

11. **Configure power management** — Implement sleep/stop mode transitions based on system state. Set wake-up sources (EXTI lines, RTC alarm, USART wake).
    **Checkpoint:** After waking from Stop mode, the HSI oscillator is selected as system clock — your code must reconfigure the clock tree before using peripherals that require specific clock speeds.

12. **Validate with debugging tools** — Use SWO/ITM for non-blocking console output. Verify timing with STM32 SysTick counter or hardware trace.
    **Checkpoint:** If SWO is not working, verify Pinout → Connectivity → SYSCONFIG → Trace Asynchronous Switch → Enable in CubeMX and set SWO frequency.

### Phase 4: Testing and Verification

13. **Hardware validation** — Flash the device and verify all peripheral operations with a logic analyzer or oscilloscope.
    - SPI clock shape and timing (setup/hold times)
    - UART bit timing accuracy (±2% for reliable communication)
    - ADC sampling waveform integrity at configured sampling rate
    **Checkpoint:** Compare measured current draw against power management expectations in each system state.

14. **Stress testing** — Run the firmware under load conditions: maximum DMA throughput, all peripherals active simultaneously, rapid mode transitions.
    **Checkpoint:** Monitor for RAM usage near stack boundaries (check `uxTaskGetStackHighWaterMark()` for each task).

---

## Implementation Patterns

### Pattern 1: DMA-Based Circular ADC Sampling with Timer Trigger

Configure ADC to sample multiple channels in scan mode, triggered by a timer event, with DMA writing circularly into a ring buffer. This is the standard pattern for sensor acquisition at 1-100kHz rates.

```c
/* adc_dma.h — DMA-based circular ADC sampling header */
#ifndef ADC_DMA_H
#define ADC_DMA_H

#include "stm32f4xx_hal.h"
#include <stdint.h>

#define ADC_SAMPLE_CHANNELS   3       /* CH0, CH1, CH2 */
#define ADC_RING_BUFFER_SIZE  256     /* Must be power of 2 for ring logic */
#define ADC_DMA_TRANSFER_UNITS DMA_MEMORYWIDTH_16BIT

extern ADC_HandleTypeDef hadc1;
extern DMA_HandleTypeDef hdma_adc1;

/* Ring buffer state */
typedef struct {
    uint16_t raw_samples[ADC_SAMPLE_CHANNELS][ADC_RING_BUFFER_SIZE];
    volatile uint32_t write_index;
    volatile uint32_t samples_per_channel_collected;
    volatile uint8_t conversion_complete_flag;
} ADC_DMA_Buffer_t;

extern ADC_DMA_Buffer_t g_adc_buffer;

/* Initialize ADC with DMA in continuous circular mode */
int32_t ADC_DMA_Init(void);

/* Read the number of new complete sample sets since last call */
uint32_t ADC_DMA_GetNewSampleCount(void);

#endif /* ADC_DMA_H */
```

```c
/* adc_dma.c — DMA-based circular ADC sampling implementation */
#include "adc_dma.h"

ADC_DMA_Buffer_t g_adc_buffer = {0};

static void ADC_DMA_ConvCpltCallback(ADC_HandleTypeDef *hadc)
{
    g_adc_buffer.conversion_complete_flag = 1;
    g_adc_buffer.samples_per_channel_collected++;
}

int32_t ADC_DMA_Init(void)
{
    /* Ensure DMA and ADC clocks are enabled by CubeMX HAL */
    
    /* Start ADC in continuous mode with DMA circular mode.
     * Timer trigger (TIM2 TRGO) must be configured separately
     * to set the actual sampling frequency. */
    if (HAL_ADC_Start_DMA(&hadc1,
             (uint32_t *)g_adc_buffer.raw_samples[0],
             ADC_SAMPLE_CHANNELS * ADC_RING_BUFFER_SIZE) != HAL_OK) {
        return -1;  /* DMA/ADC initialization failed */
    }

    /* Register conversion complete callback */
    if (HAL_ADC_RegisterCallback(&hadc1,
             HAL_ADC_CONVERSION_COMPLETE_CB_ID,
             ADC_DMA_ConvCpltCallback) != HAL_OK) {
        return -2;  /* Callback registration failed */
    }

    return 0;  /* Success */
}

uint32_t ADC_DMA_GetNewSampleCount(void)
{
    uint32_t count = g_adc_buffer.samples_per_channel_collected;
    
    if (count > 0 && g_adc_buffer.conversion_complete_flag) {
        g_adc_buffer.conversion_complete_flag = 0;
    }
    return count;
}

/* DMA interrupt handler — typically auto-generated by CubeMX,
 * but the callback above is where your application logic lives.
 * The ring buffer wraps automatically because DMA_CIRCULAR mode
 * resets the address pointer when it reaches the buffer end. */
```

### Pattern 2: FreeRTOS Task with Queue-Based Sensor Fusion Pipeline

A producer-consumer pipeline where an ADC sampling task pushes processed values through a queue to a control loop task. Demonstrates proper RTOS synchronization, memory management, and priority assignment.

```c
/* sensor_fusion.h — FreeRTOS sensor fusion pipeline */
#ifndef SENSOR_FUSION_H
#define SENSOR_FUSION_H

#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
#include <stdint.h>
#include <stdbool.h>

/* Sensor data message passed via queue (aligned for DMA) */
typedef struct __attribute__((packed, aligned(4))) {
    int16_t accel_x;
    int16_t accel_y;
    int16_t accel_z;
    int16_t gyro_x;
    int16_t gyro_y;
    int16_t gyro_z;
    uint32_t timestamp_ms;
} SensorMessage_t;

/* PID control output sent back from control task */
typedef struct {
    float pid_output;
    bool valid;
} ControlOutput_t;

/* Task handle and queue globals */
extern QueueHandle_t xSensorQueue;
extern QueueHandle_t xControlQueue;
extern TaskHandle_t xADCTaskHandle;
extern TaskHandle_t xControlTaskHandle;

/* Task entry points — called from main() */
void vADCSensorTask(void *pvParameters);
void vControlLoopTask(void *pvParameters);

#endif /* SENSOR_FUSION_H */
```

```c
/* sensor_fusion.c — RTOS task implementation */
#include "sensor_fusion.h"
#include "adc_dma.h"
#include "i2c_sensor.h"   /* Your I2C IMU driver */
#include <string.h>

QueueHandle_t xSensorQueue;
QueueHandle_t xControlQueue;
TaskHandle_t xADCTaskHandle;
TaskHandle_t xControlTaskHandle;

/* ADC sampling task — highest priority among application tasks.
 * Reads sensor data via I2C, processes through the ADC DMA buffer,
 * and pushes messages to the queue. Blocks on the queue when full. */
void vADCSensorTask(void *pvParameters)
{
    SensorMessage_t msg;
    
    /* Initialize all members */
    memset(&msg, 0, sizeof(msg));

    for (;;) {
        /* Wait for ADC DMA conversion complete */
        while (!g_adc_buffer.conversion_complete_flag) {
            osDelay(1);  /* Yield to lower-priority tasks */
        }
        
        /* Read raw ADC values from the ring buffer */
        uint32_t idx = g_adc_buffer.write_index;
        msg.accel_x = (int16_t)g_adc_buffer.raw_samples[0][idx];
        msg.accel_y = (int16_t)g_adc_buffer.raw_samples[1][idx];
        msg.accel_z = (int16_t)g_adc_buffer.raw_samples[2][idx];

        /* Read IMU gyroscope via I2C — use HAL with timeout */
        if (IMU_ReadGyro(&msg.gyro_x, &msg.gyro_y, &msg.gyro_z) != 0) {
            continue;  /* Skip this cycle on I2C failure */
        }

        /* Timestamp from FreeRTOS tick counter */
        msg.timestamp_ms = xTaskGetTickCount();

        /* Send to control task — block up to 10ms if queue is full */
        if (xQueueSend(xSensorQueue, &msg, pdMS_TO_TICKS(10)) != pdPASS) {
            /* Queue full: either the control task is too slow
             * or we need to reduce sampling rate. Log this condition. */
            continue;
        }

        /* Target 1kHz sampling — 1ms between cycles.
         * Subtract processing overhead for accurate timing. */
        osDelay(1);
    }
}

/* Control loop task — processes sensor messages and computes outputs.
 * Priority should be below ADC task to ensure fresh data is always available. */
void vControlLoopTask(void *pvParameters)
{
    SensorMessage_t msg;
    ControlOutput_t ctrl_out = {0};

    for (;;) {
        /* Block until sensor message is available.
         * This yields the CPU when no new data arrives,
         * saving power and allowing lower-priority tasks to run. */
        if (xQueueReceive(xSensorQueue, &msg, portMAX_DELAY) == pdPASS) {
            /* Apply complementary filter for orientation estimate */
            float angle_x = 0.5f * msg.accel_y + 0.5f * (msg.gyro_x * 0.016f);

            /* Simple P-controller example — replace with full PID */
            float setpoint = 0.0f;
            ctrl_out.pid_output = -10.0f * (angle_x - setpoint);
            ctrl_out.valid = true;

            /* Send control output — non-blocking to avoid priority inversion */
            xQueueSend(xControlQueue, &ctrl_out, pdMS_TO_TICKS(5));
        }
    }
}
```

### Pattern 3: UART with DMA and ITM printf Redirect (Debug Output)

Non-blocking UART communication using DMA paired with SWO/ITM for debug logging. This pattern separates the debug console from the data-bearing UART, preventing log output from blocking sensor acquisition or control loops.

```c
/* debug_console.h — ITM printf redirect and UART DMA header */
#ifndef DEBUG_CONSOLE_H
#define DEBUG_CONSOLE_H

#include <stdio.h>
#include <string.h>
#include "stm32f4xx_hal.h"

/* SWO/ITM printf support — set _PRINTF_ENABLE_ITM to 1 in CubeIDE preprocessor defines */
#define _PRINTF_ENABLE_ITM    1
#define _PRINTF_USE_UART      1

extern UART_HandleTypeDef huart2;
extern DMA_HandleTypeDef hdma_usart2_tx;

void Debug_Console_Init(void);
int32_t DEBUG_SendDMA(const uint8_t *data, uint16_t length);

#endif /* DEBUG_CONSOLE_H */
```

```c
/* debug_console.c — Non-blocking console output */
#include "debug_console.h"

#ifdef __ARMCC_VERSION
/* ARM Compiler */
#elif defined(__GNUC__)
/* GCC (STM32CubeIDE, PlatformIO) */

/* Override putchar for ITM/SWO trace output.
 * When ITM is enabled, printf output goes over SWO pin
 * at up to 10MHz without consuming UART or blocking.
 * This is vastly superior to UART-based debug logging. */
__attribute__((weak)) int _write(int file, char *ptr, int len)
{
    (void)file;
#if _PRINTF_ENABLE_ITM
    /* ITM port 1 — corresponds to Debug_Console_Init() setting */
    for (int i = 0; i < len; i++) {
        while (ITM->PORT[1].u32 == 0);  /* Wait for ITM ready */
        ITM->PORT[1].u8 = (uint8_t)*ptr++;
    }
#else
    /* Fallback: non-blocking DMA UART transmission */
    if (_PRINTF_USE_UART) {
        HAL_UART_Transmit_DMA(&huart2, (uint8_t *)ptr, len);
    }
#endif
    return len;
}

int32_t DEBUG_SendDMA(const uint8_t *data, uint16_t length)
{
    if (data == NULL || length == 0) {
        return -1;  /* Invalid parameters */
    }
    
    /* Non-blocking DMA transmit — returns immediately.
     * Application must check HAL_UART_STATE_BUSY state or
     * register a half/complete transfer callback for flow control. */
    if (HAL_UART_Transmit_DMA(&huart2, data, length) != HAL_OK) {
        return -2;  /* DMA already in use or not initialized */
    }
    return 0;
}

#endif
```

### Pattern 4: Clock Tree Configuration for STM32F4 (PLL from HSE)

The clock tree is the foundation of correct STM32 operation. This pattern shows how to configure the PLL for maximum SYSCLK with proper bus clock dividers. In STM32CubeMX this is done visually; this section documents what each setting means for code correctness.

```c
/* system_clock.c — Post-generation clock configuration override.
 * CubeMX generates SystemClock_Config() in main.c. This pattern
 * shows the correct register-level understanding for troubleshooting.
 * 
 * For STM32F407: HSE = 8MHz, PLL_M=8, PLL_N=336, PLL_P=2 → SYSCLK = 168MHz
 * AHB div = 1 (168MHz), APB1 div = 4 (42MHz max for APB1 peripherals)
 * APB2 div = 2 (84MHz max for APB2 peripherals) */

/* Register-level clock configuration — for understanding what CubeMX generates.
 * HAL_RCC_ClockConfig() handles the actual register writes with proper
 * wait-state insertion for flash latency at different frequencies. */
void SystemClock_Config(void)
{
    RCC_OscInitTypeDef RCC_OscInitStruct = {0};
    RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

    /* Configure the main internal regulator output voltage */
    __HAL_RCC_PWR_CLK_ENABLE();
    __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

    /* Initialize all configured peripherals + configure the main
     * internal regulator output voltage. VSCALE1 = 0-180MHz range. */
    RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSE;
    RCC_OscInitStruct.HSEState = RCC_HSE_ON;
    RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
    RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
    RCC_OscInitStruct.PLL.PLLM = 8;     /* 8MHz / 8 = 1MHz VCO input */
    RCC_OscInitStruct.PLL.PLLN = 336;   /* 1MHz × 336 = 336MHz VCO clock */
    RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;  /* 336 / 2 = 168MHz SYSCLK */
    RCC_OscInitStruct.PLL.PLLQ = 7;     /* USB OTG FS: 336/7 = 48MHz required */

    if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK) {
        /* Error handler — infinite loop in production, breakpoint in debug */
        while (1) { __BKPT(); }
    }

    /* Initialize the CPU, AHB, and APB busses clock divider settings.
     * Flash wait states must increase with frequency:
     *   0-30MHz:  WS=0
     *   30-60MHz: WS=1
     *   60-90MHz: WS=2
     *   90-120MHz: WS=3
     *   120-150MHz: WS=4
     *   150-180MHz: WS=5 */
    RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK | RCC_CLOCKTYPE_SYSCLK
                                | RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;
    RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
    RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;   /* 168MHz */
    RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV4;     /* 42MHz (within 42MHz limit) */
    RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV2;     /* 84MHz (within 84MHz limit) */

    if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_5) != HAL_OK) {
        while (1) { __BKPT(); }
    }
}
```

### Pattern 5: Power Management — Sleep/Stop Mode Transitions

STM32 low-power modes form a hierarchy of power savings vs wake-up time. Implement the appropriate mode based on idle duration expectations. This pattern demonstrates Stop 2 mode (common for battery-powered sensor nodes) with RTC alarm wake-up.

```c
/* power_management.c — Low-power mode transitions */
#include "stm32f4xx_hal.h"
#include <stdbool.h>

/* Wake-up reason enumeration for post-wake diagnostics */
typedef enum {
    WAKE_FROM_SLEEP  = 0,  /* WFI/WFE entered Sleep mode */
    WAKE_FROM_RTC    = 1,  /* RTC alarm or wakeup interrupt */
    WAKE_FROM_EXTI   = 2,  /* External interrupt line */
    WAKE_FROM_USART  = 3,  /* USART wake from Stop mode */
} WakeupSource_t;

/* Enter Stop 2 mode with RTC alarm wake-up.
 * In Stop 2: VREG in low-power mode, 1.2V domain clocked, 
 * PLL/HSE/HSI OFF. Wake-up time ~5us + HSI startup ~3us. */
void Power_EnterStopMode(RTC_HandleTypeDef *hrtc)
{
    /* Clear all pending wakeup flags before entering stop mode */
    __HAL_PWR_CLEAR_FLAG(PWR_FLAG_WU);

    /* Configure RTC alarm A for wake-up (set this separately).
     * Alarm must be armed BEFORE entering stop mode. */
    HAL_RTCEx_SetAlarm_IT(hrtc, RTC_ALARMA, RTC_ALARM_A);

    /* Enter Stop 2 low-power mode with WFI instruction.
     * The CPU clock is stopped. Only the 32kHz LSI/LSE and
     * RTC continue running. RAM and register contents are preserved. */
    HAL_PWR_EnterSTOPMode(PWR_LOWPOWERREGULATOR_ON, PWR_STOPENTRY_WFI);

    /* Code resumes here after wake-up.
     * IMPORTANT: The system clock is now HSI (16MHz default).
     * You MUST reconfigure the clock tree before using peripherals
     * that require specific bus clock speeds (SPI, I2C, etc.) */
}

/* Post-wake: restore the system clock after Stop mode exit.
 * Call this immediately after HAL_PWR_EnterSTOPMode() returns. */
void Power_PostWakeClockRestore(void)
{
    /* The HSI oscillator is now running at 16MHz.
     * If your application needs the original PLL configuration,
     * re-call SystemClock_Config() to restore the full clock tree. */
    SystemClock_Config();

    /* Re-initialize peripherals that lose state during Stop mode.
     * Some peripherals retain configuration (UART with wake bit),
     * others need full re-initialization. */
    // HAL_RCC_DeInit();  /* Optional: if you need a clean slate */
}

WakeupSource_t Power_GetWakeSource(void)
{
    WakeupSource_t source = WAKE_FROM_SLEEP;

    /* Check RCC reset flags to determine wake-up cause */
    if (__HAL_RCC_GET_FLAG(RCC_FLAG_RTCSTDRST)) {
        __HAL_RCC_CLEAR_RESET_FLAGS();
        source = WAKE_FROM_RTC;
    } else if (__HAL_PWR_GET_FLAG(PWR_FLAG_WUF1) || 
               __HAL_PWR_GET_FLAG(PWR_FLAG_WUF2)) {
        __HAL_PWR_CLEAR_FLAG(PWR_FLAG_WU);
        source = WAKE_FROM_EXTI;
    }

    return source;
}
```

---

## Firmware Architecture Patterns

### HAL vs LL vs Direct Register Access

| Layer | Performance | Portability | Maintainability | Use Case |
|-------|-------------|-------------|-----------------|----------|
| **HAL** | ~80% of raw speed | Full ST family portability (with recompile) | High — abstracts register details | Application logic, rapid prototyping |
| **LL**  | ~95% of raw speed | Limited to specific STM32 series | Medium — still typed macros per series | Time-critical code paths, tight loops |
| **Direct Register** | 100% raw speed | Zero portability | Low — full reference manual required | Bootloaders, critical ISR timing, bit-banging |

**Recommendation:** Use HAL for the majority of firmware. Drop to LL only for hot paths that prove to be bottlenecks via hardware tracing (DWT cycle counter). Never mix LL and HAL calls on the same peripheral in the same execution path.

### Hardware Abstraction Layer Design

Create board-specific wrapper functions above the HAL layer. This makes your application logic testable with mock peripherals and portable across STM32 variants.

```c
/* board_io.h — Board-specific I/O abstraction (your code, not ST's) */
#ifndef BOARD_IO_H
#define BOARD_IO_H

#include <stdint.h>
#include <stdbool.h>

/* LED interface */
void Board_LED_Init(void);
void Board_LED_On(uint8_t led_index);
void Board_LED_Off(uint8_t led_index);
void Board_LED_Toggle(uint8_t led_index);

/* Button interface with debouncing */
bool Board_Button_IsPressed(uint8_t button_index);
uint32_t Board_Button_GetDebounceTime(uint8_t button_index);

/* I2C sensor interface (wraps HAL_I2C_Mem_Read/Write) */
int32_t Board_I2C_ReadSensor(uint8_t device_addr, uint8_t reg_addr, 
                              uint8_t *data, uint16_t length);
int32_t Board_I2C_WriteSensorReg(uint8_t device_addr, uint8_t reg_addr, 
                                  uint8_t value);

#endif /* BOARD_IO_H */
```

---

## Constraints

### MUST DO
- Always configure the clock tree in CubeMX before generating code — never leave default HSI at 16MHz for production
- Use DMA for UART TX/RX whenever throughput exceeds 9600 baud or latency matters
- Set FreeRTOS task stack sizes conservatively: minimum 256 words (1KB) for simple tasks, 512+ words (2KB) for tasks with floating-point or local arrays
- Enable `configUSE_TRACE_FACILITY` and `configUSE_STATS_FORMATTING_FUNCTIONS` in FreeRTOSConfig.h for runtime monitoring
- Register NVIC priority grouping to 4-bit preemptive priority (`NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_4)`) before enabling any interrupts
- Use `__WEAK` function attributes for HAL callback overrides — never modify the auto-generated `stm32f4xx_it.c` directly
- Align DMA buffer structures with `__attribute__((aligned(4)))` or `DMA_MEMORYWIDTH_x` to prevent misalignment faults on Cortex-M4
- Handle all HAL return codes — check for `HAL_ERROR`, `HAL_TIMEOUT`, and `HAL_BUSY` before proceeding

### MUST NOT DO
- Never use blocking `HAL_Delay()` in FreeRTOS tasks — use `osDelay()` instead (calls vTaskDelay internally)
- Never call HAL functions from inside an ISR callback — use a queue or flag mechanism to defer to a task
- Never exceed the maximum SPI clock for your device (e.g., STM32F4 SPI max is 36MHz on APB2 at 84MHz with /2 divider = 42MHz → use /4 divider)
- Never leave GPIO pins in analog mode that you later try to use as digital inputs — reconfigure the pin or use a different pin
- Never rely on CubeMX's default heap allocation (`Heap_1`) for production systems that create/destroy objects at runtime — use `Heap_4` or `Heap_5`
- Never call `HAL_Init()` more than once in a program — it configures SysTick and NVIC globally
- Never disable the watchdog before flash programming fails — this can brick devices with incomplete firmware
- Never share DMA buffers between concurrent transfers on the same stream — the DMA controller does not queue requests

---

## Debugging Workflow

### SWD/JTAG and ST-Link

1. **Connect hardware** — ST-Link V2/V3 mini to the 10-pin SWD header (SWCLK, SWDIO, GND, VTref). Verify VTref matches board voltage (3.3V or 1.8V).
   **Checkpoint:** If STM32CubeProgrammer cannot detect the device, verify pin connections and try a mass erase: Target → Mass Erase.

2. **Configure SWO/ITM trace** — Enable ITM in CubeMX (SYS → Trace Asynchronous Switch) and set the SWO frequency to match your target baud rate for printf output.
   **Checkpoint:** STM32CubeIDE must be configured to use ITM port 1 (`View → Serial Wire Viewer → Port: 1`).

3. **Use OpenOCD for headless debugging** — Essential for CI/CD flashing and GDB-based automation.
   ```bash
   # Flash and debug with OpenOCD + GDB (PlatformIO compatible)
   openocd -f interface/stlink.cfg -f target/stm32f4x.cfg -c "program build/firmware.elf verify reset exit"
   
   # Or launch GDB session:
   openocd -f interface/stlink.cfg -f target/stm32f4x.cfg &
   arm-none-eabi-gdb --command=gdbinit build/firmware.elf
   ```

### Logic Analyzer Integration

For hardware signal validation (SPI timing, UART frame integrity, ADC trigger alignment):

1. Use Saleae Logic Pro or similar tool to capture SPI clock/data lines during DMA transfers
2. Verify UART bit timing — measure actual baud rate vs configured. The STM32 USART must stay within ±2% of target baud for reliable communication
3. Correlate FreeRTOS task switches with hardware events using GPIO toggling at key code locations

```c
/* GPIO toggle for logic analyzer debugging — zero overhead when disabled */
#ifndef DEBUG_TOGGLE_PIN
#define DEBUG_TOGGLE_PIN  GPIO_PIN_0
#define DEBUG_TOGGLE_PORT GPIOA
#endif

#define TRACE_HIGH()  HAL_GPIO_WritePin(DEBUG_TOGGLE_PORT, DEBUG_TOGGLE_PIN, GPIO_PIN_SET)
#define TRACE_LOW()   HAL_GPIO_WritePin(DEBUG_TOGGLE_PORT, DEBUG_TOGGLE_PIN, GPIO_PIN_RESET)
#define TRACE_TOGGLE() HAL_GPIO_TogglePin(DEBUG_TOGGLE_PORT, DEBUG_TOGGLE_PIN)

/* Usage: toggle pin at entry and exit of critical code section */
// TRACE_HIGH();
// DMA_Transfer_Start();
// while (HAL_DMA_GetState(&hdma) != HAL_DMA_STATE_READY);
// TRACE_LOW();
```

---

## Toolchains and Build Systems

| Toolchain | Best For | Key Features |
|-----------|----------|--------------|
| **STM32CubeIDE** (Eclipse-based, GCC ARM 12+) | Full-featured development with CubeMX integration | Hardware breakpoints, SWO tracing, memory viewer, built-in debugger |
| **PlatformIO** (`platform-ststm32`) | Cross-platform builds, CI/CD pipelines, VSCode users | Automatic dependency management, library ecosystem, `pio run -t upload` |
| **GCC ARM Embedded + Make/CMake** | Custom build systems, embedded Linux environments | Full control over linker scripts, optimization flags, post-build hooks |
| **IAR Embedded Workbench** | Commercial projects with RTOS analysis | Cycle-accurate simulation, advanced profiler, vendor support |

### PlatformIO `platformio.ini` for STM32F407

```ini
[env:stm32f407vg]
platform = ststm32
board = genericSTM32F407VG
framework = stm32cube
monitor_speed = 115200
monitor_filters = send_on_enter, time_color

# Toolchain settings
board_build.f_cpu = 168000000L
upload_protocol = stlink
debug_tool = stlink

# C/C++ standards and optimization
build_flags = 
    -Os
    -Wall
    -Wextra
    -DUSE_HAL_DRIVER
    -DSTM32F407xx
    -DPRINTF_ENABLE_ITM=1
    
lib_deps =
    freertos/freertos@^10.5.1

# Linker script for Heap_5 (fragmented allocation support)
build_unflags =
    -specs=nano.specs
build_flags = 
    ${env.build_flags}
    -specs=nosys.specs
```

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-code-review` | Review STM32 firmware code for bugs, race conditions in RTOS tasks, and memory safety |
| `linux-embedded-linux` | Debug Linux-based embedded boards — complementary when your system has a Linux bootloader on STM32 + application processor |
| `coding-test-driven-development` | Apply TDD patterns to embedded firmware development with hardware-in-the-loop testing |

---

## Live References

> Authoritative documentation links for STM32 development. The model follows markdown links at load time to resolve external references and inline content.

- [STM32F4 Reference Manual (RM0090)](https://www.st.com/resource/en/reference_manual/dm00031020.pdf) — Complete register description, memory map, and peripheral details for STM32F4 series
- [STM32CubeMX User Guide](https://www.st.com/content/stcom/commercial-tools/user-guides.html) — Official guide for CubeMX configuration workflow
- [STM32 HAL Driver Documentation](https://www.st.com/resource/en/reference_manual/dm00105320.pdf) — HAL API reference with initialization structures and callback documentation
- [ARM CMSIS Documentation](https://arm-software.github.io/CMSIS/latest/index.html) — Cortex-M core peripheral access layer, DWT cycle counter, ITM trace
- [FreeRTOS Kernel Reference](https://www.freertos.org/a00106.html) — Task management, queues, semaphores, and memory heap configuration
- [STM32CubeIDE User Guide](https://www.st.com/resource/en/user_manual/dm00589771.pdf) — IDE features including hardware debugging, SWO tracing, and profiler
- [ST-Link Utility Documentation](https://www.st.com/resource/en/user_manual/um0681-stlinkutility-stmicroelectronics.pdf) — Mass erase, firmware update, and debug probe configuration
