# Timeline Sort Key Specification

## Definition

`timeline_sort_key` is a **fractional indexing token** (lexicographically sortable string) that enables client-side timeline ordering without revealing event dates to the server.

Per Technical Appendix §7.2 (LOCKED):
> "reveals ordering but not event date; supports insertion between two keys without renumbering; server sorts purely by this token"

## Format Rules (Binding)

### Allowlist Charset
- **MUST** use base64url character set: `[A-Za-z0-9_-]` only
- **MUST NOT** contain `=` padding
- **Minimum length**: 8 characters

### Date Prohibition (LOCKED)
- **MUST NOT** encode ISO dates or timestamps in any form
- **MUST NOT** resemble `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS` patterns
- Event date is stored encrypted in `memories.encrypted_metadata_blob` only

### Collision Safety
- Generated keys **MUST** be unique within a family's timeline
- **Recommended**: Database constraint `UNIQUE(family_id, timeline_sort_key)`
- **Fallback**: If collision occurs, regenerate with extra precision and retry

## Ordering Behavior

### Lexicographic Sorting
- Server sorts memories by `ORDER BY timeline_sort_key ASC` (or DESC)
- Keys must sort lexicographically to match decrypted chronological order
- No server-side date parsing or decryption required

### Insertion Between Neighbors
Client must support:
- `between(prev: string | null, next: string | null): string` — Generate key between two neighbors
- `after(last: string | null): string` — Generate key after the last item

Example sequence (valid):
```
"aB3_dEfG"
"hI7_JkLm"
"qRs-TuVw"
```

## Implementation Reference

See `apps/web/src/lib/timelineSortKey.ts` for fractional indexing implementation with tests.

## Enforcement Gates

- **CI Lint**: `pnpm timelineSortKey:lint` fails if any `timeline_sort_key` resembles date patterns
- **Unit Tests**: Prove insertion between tokens maintains lexicographic order
- **Integration Tests**: Verify server ordering matches client-decrypted chronological order

## Examples

### Valid Keys (Allowed)
- `aB3_dEfGhIjK`
- `mN7-pQrS`
- `xYz_123_ABC`

### Invalid Keys (Rejected)
- `2024-01-15` — resembles ISO date
- `20240115T120000` — resembles ISO timestamp
- `abc=` — contains padding
- `short` — below minimum length (8 chars)
- `abc def` — contains space (not in allowlist charset)

## Rationale

**Privacy**: Event dates are user vault content and must remain encrypted. The sort key reveals only relative ordering.

**Scalability**: Fractional indexing avoids renumbering all keys when inserting between existing items.

**Determinism**: Lexicographic sorting is database-native and requires no custom logic or decryption.

