// SPDX-License-Identifier: MIT
/*
 * Minimal AppleSMC fan reader for dsh-sys-monitor.
 * Reads only fan count, current/min/max/target RPM. No writes, no privileged helper.
 */
#include <IOKit/IOKitLib.h>
#include <mach/mach.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

typedef struct {
  char major;
  char minor;
  char build;
  char reserved[1];
  uint16_t release;
} SMCVersion;

typedef struct {
  uint16_t version;
  uint16_t length;
  uint32_t cpuPLimit;
  uint32_t gpuPLimit;
  uint32_t memPLimit;
} SMCPLimitData;

typedef struct {
  uint32_t dataSize;
  uint32_t dataType;
  char dataAttributes;
} SMCKeyInfo;

typedef struct {
  uint32_t key;
  SMCVersion vers;
  SMCPLimitData pLimitData;
  SMCKeyInfo keyInfo;
  char result;
  char status;
  char data8;
  uint32_t data32;
  uint8_t bytes[32];
} SMCKeyData;

static uint32_t key_from_string(const char *key) {
  return ((uint32_t)(uint8_t)key[0] << 24) | ((uint32_t)(uint8_t)key[1] << 16)
    | ((uint32_t)(uint8_t)key[2] << 8) | (uint32_t)(uint8_t)key[3];
}

static kern_return_t smc_call(io_connect_t conn, SMCKeyData *input, SMCKeyData *output) {
  size_t output_size = sizeof(*output);
  return IOConnectCallStructMethod(conn, 2, input, sizeof(*input), output, &output_size);
}

static kern_return_t read_key(io_connect_t conn, const char *key, uint32_t *data_size, uint8_t *bytes) {
  SMCKeyData input;
  SMCKeyData output;
  memset(&input, 0, sizeof(input));
  memset(&output, 0, sizeof(output));
  input.key = key_from_string(key);
  input.data8 = 9; /* read key info */
  kern_return_t result = smc_call(conn, &input, &output);
  if (result != kIOReturnSuccess) return result;
  *data_size = output.keyInfo.dataSize;
  if (*data_size > sizeof(output.bytes)) return kIOReturnError;
  input.keyInfo.dataSize = *data_size;
  input.data8 = 5; /* read bytes */
  memset(&output, 0, sizeof(output));
  result = smc_call(conn, &input, &output);
  if (result != kIOReturnSuccess) return result;
  memcpy(bytes, output.bytes, *data_size);
  return kIOReturnSuccess;
}

static int read_u8(io_connect_t conn, const char *key, uint8_t *value) {
  uint32_t size = 0;
  uint8_t bytes[32] = {0};
  if (read_key(conn, key, &size, bytes) != kIOReturnSuccess || size < 1) return 0;
  *value = bytes[0];
  return 1;
}

static int read_float(io_connect_t conn, const char *key, float *value) {
  uint32_t size = 0;
  uint8_t bytes[32] = {0};
  if (read_key(conn, key, &size, bytes) != kIOReturnSuccess || size < 4) return 0;
  memcpy(value, bytes, sizeof(float));
  return 1;
}

int main(void) {
  io_service_t service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("AppleSMC"));
  if (!service) return 1;
  io_connect_t conn = 0;
  kern_return_t result = IOServiceOpen(service, mach_task_self(), 0, &conn);
  IOObjectRelease(service);
  if (result != kIOReturnSuccess || !conn) return 1;

  uint8_t count = 0;
  if (!read_u8(conn, "FNum", &count)) {
    puts("{\"fans\":[]}");
    IOServiceClose(conn);
    return 0;
  }
  if (count > 20) count = 20;

  printf("{\"fans\":[");
  for (uint8_t i = 0; i < count; i += 1) {
    char key[5];
    float current = 0, min = 0, max = 0, target = 0;
    if (i > 0) putchar(',');
    snprintf(key, sizeof(key), "F%dAc", i);
    read_float(conn, key, &current);
    snprintf(key, sizeof(key), "F%dMn", i);
    read_float(conn, key, &min);
    snprintf(key, sizeof(key), "F%dMx", i);
    read_float(conn, key, &max);
    snprintf(key, sizeof(key), "F%dTg", i);
    if (!read_float(conn, key, &target)) target = current;
    printf("{\"index\":%u,\"rpm\":%.0f,\"min\":%.0f,\"max\":%.0f,\"target\":%.0f}",
      (unsigned)i, current, min, max, target);
  }
  puts("]}");
  IOServiceClose(conn);
  return 0;
}
