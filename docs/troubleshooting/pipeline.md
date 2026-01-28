# Pipeline Troubleshooting Guide

## Quality Gate Failures

### Parse Rate < 95%

**Symptoms**: Phase 1 exits with code 1, validation report shows `parse_rate.status: "fail"`

**Diagnosis**:
```bash
# Check validation report
cat processed/validation_report.json | jq '.gates.parse_rate'
```

**Common Causes**:
- Malformed JSON blocks in source file
- Missing required fields in source blocks
- Unexpected block types

**Solutions**:
1. Check source JSON structure matches expected format
2. Verify all blocks have required fields: `id`, `block_type`, `content`
3. Review parser logs for specific block IDs that failed

---

### Ligature Count > 0

**Symptoms**: Phase 1 fails ligature gate, characters like `ﬁ`, `ﬂ`, `ﬀ` remain in output

**Diagnosis**:
```bash
# Search for remaining ligatures
grep -r '[ﬁﬂﬀﬃ]' processed/document.json
```

**Common Causes**:
- Source text contains ligatures not in normalizer's map
- Unicode normalization order issues

**Solutions**:
1. Add missing ligature mappings to `src/services/normalizer/`
2. Run normalization pass twice if needed
3. Check source encoding (should be UTF-8)

---

### Figure Coverage < 90%

**Symptoms**: Phase 1 figure_coverage gate fails, many figures marked "unresolved"

**Diagnosis**:
```bash
# Check figure map summary
cat processed/figure_map.json | jq '.summary'

# List unresolved figures
cat processed/figure_map.json | jq '.figures | to_entries | map(select(.value.status == "unresolved")) | .[].key'
```

**Common Causes**:
- Image files missing from `imageDir`
- Figure ID format mismatch (e.g., "Fig 4.1" vs "Fig. 4.1")
- Images not named consistently with figure IDs

**Solutions**:
1. Verify all images exist in configured `imageDir`
2. Check figure ID regex pattern in schemas
3. Review figure-mapper logs for matching failures

---

## Schema Validation Errors

### Zod Parse Errors

**Symptoms**: Error message like `Validation failed: chunk_id: Invalid...`

**Reading Zod Errors**:
```
path.to.field: Error message
```

- `path.to.field` - JSON path to problematic field
- Error message describes the constraint violation

**Common Issues**:

| Error | Cause | Fix |
|-------|-------|-----|
| `chunk_id: Invalid` | ID doesn't match regex | Check format: `{doc-id}-chunk-{0001}` |
| `token_count: Number must be <= 600` | Chunk too large | Adjust splitter parameters |
| `breadcrumb_text: Invalid` | Missing `[Context: ...]` format | Check breadcrumb builder |

---

## File Not Found Issues

### Config Path Errors

**Symptoms**: `ENOENT: no such file or directory`

**Diagnosis**:
```bash
# Verify config paths
cat config/source-paths.json | jq '.sources'
```

**Solutions**:
1. Use absolute paths in config
2. Verify files exist at specified locations
3. Check file permissions

### Image Directory Missing

**Symptoms**: Figure mapper fails to find images

**Solutions**:
1. Verify `imageDir` path in config
2. Check directory contains expected image files
3. Ensure image filenames match expected pattern

---

## Performance Issues

### Slow Processing

**Symptoms**: Pipeline takes > 30 seconds for full document

**Diagnosis**:
- Check document size (expected: ~1690 blocks)
- Monitor memory usage during processing

**Solutions**:
1. Process smaller batches
2. Check for infinite loops in normalizer
3. Verify tokenizer isn't being called excessively

### Memory Exhaustion

**Symptoms**: Process killed, out of memory errors

**Solutions**:
1. Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
2. Process document in chunks
3. Check for memory leaks in figure mapper

---

## Debug Commands

```bash
# Run with verbose logging
DEBUG=* bun run src/cli/ingest.ts

# Check specific test
bun test --filter "quality gate"

# Validate output schemas
bun test tests/contract/schema.test.ts

# Check chunk token distribution
cat processed/chunks.json | jq '[.chunks[].token_count] | {min: min, max: max, avg: (add/length)}'
```
