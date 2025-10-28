## Background

> "Time forks perpetually toward innumerable futures."  
> — Jorge Luis Borges

After a breakup, I kept thinking about "what ifs." I started writing alternate versions of key moments. Tried using Git, but it felt wrong. So I built my own tool using SQLite.


## Why Not Git?

Git is powerful, but overkill for writing:

- Don't need merge (parallel stories stay parallel)
- Don't need DAG (linear branches are enough)
- Don't need collaboration features

I wanted something simpler: a database that models story branches.


## Database Design

Three tables model everything:
```text
stories (1) ──→ branches (N) ──→ snapshots (N)
```

### Schema
```sql
CREATE TABLE stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  current_branch TEXT,
  created_at INTEGER,
  last_modified INTEGER
);

CREATE TABLE branches (
  id TEXT PRIMARY KEY,
  story_id TEXT NOT NULL,
  name TEXT NOT NULL,
  head INTEGER DEFAULT 0,
  FOREIGN KEY (story_id) REFERENCES stories(id)
);

CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  message TEXT,
  content TEXT,
  word_count INTEGER,
  timestamp INTEGER,
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);
```

### Key Decisions

1. Sequence numbers over timestamps

- Writing has pauses and bursts
- Need definite order, not "probably correct" timing

2. Full content snapshots, not diffs (currently)

- Opening any branch shows complete story immediately
- No need to replay history

3. Linear branches, not DAG

- Stories don't merge, they fork forever (currently)
- Simpler to implement and reason about


## Mapping Git Concepts

| Git        | This Tool                   |
|------------|-----------------------------|
| Repository | Story                       |
| Branch     | Branch (name field)         |
| Commit     | Snapshot (sequence_number)  |
| HEAD       | branches.head pointer       |
| Checkout   | UPDATE current_branch       |

### Operation Flow

Here's how database operations map to user actions:

| User Action              | Database Operation              | Table Changes                      |
|--------------------------|---------------------------------|------------------------------------|
| 1. Create Story      |                                 |                                    |
| "My Novel"               | `INSERT INTO stories`           | stories +1                         |
|                          | `INSERT INTO branches`          | branches +1                        |
|                          | `INSERT INTO snapshots`         | snapshots +1                       |
| **2. Write & Commit**    |                                 |                                    |
| "Added ch.1"             | `INSERT INTO snapshots`         | snapshots +1                       |
|                          | `UPDATE branches SET head`      | branches.head: 0→1                 |
| **3. Create Branch**     |                                 |                                    |
| "alternate-ending"       | `INSERT INTO branches`          | branches +1                        |
|                          | `INSERT INTO snapshots`         | snapshots +1 (copy)                |
| **4. Switch Branch**     |                                 |                                    |
| "checkout"               | `UPDATE stories.current_branch` | current_branch: main→alternate     |
|                          | `SELECT content`                | Return to editor                   |
| **5. Continue Writing**  |                                 |                                    |
| "New ending"             | `INSERT INTO snapshots`         | snapshots +1 (alternate)           |
|                          | `UPDATE branches SET head`      | branches.head: 0→1 (alternate)     |

**Final State:**
- stories: 1 row
- branches: 2 rows (main, alternate-ending)
- snapshots: 4 rows (main: 2, alternate: 2)


## Atomicity: Why It Matters

When building applications, we often focus on getting things to work. But understanding why databases enforce atomicity is fascinating. Databases sit between the OS and application layer. They encapsulate complexity so we don't worry about concurrency issues. But what does atomicity actually prevent?

#### The Problem

Creating a story requires three inserts (story → branch → snapshot). These operations must be atomic:
```javascript
db.transaction(() => {
  createStory();     // 1. Story metadata
  createBranch();    // 2. Main branch
  createSnapshot();  // 3. Initial commit
});
```

**Without transactions, things break:**
```javascript
// Dangerous
createStory();     // Success
createBranch();    // FAILS - disk full
createSnapshot();  // Never executes

// Result: Orphaned story in database
// App crashes when user tries to open it
```

### What Could Go Wrong

**Scenario 1: Partial Creation**
- Story exists in `stories` table
- No branch in `branches` table
- User sees the story in the list
- Clicking it crashes: `branches.head` pointer has nowhere to point

**Scenario 2: Inconsistent State**
- Story and branch exist
- No initial snapshot
- `branches.head = 0` points to non-existent snapshot
- Editor shows blank or throws error

**Scenario 3: Concurrent ID Conflicts**
- Two users create stories simultaneously
- `generateId()` produces same ID (timestamp collision)
- Second INSERT violates primary key constraint
- But first two operations already executed
- Leaves garbage data in database

### The Solution

With transactions, the database provides automatic rollback:
```javascript
// Safe
db.transaction(() => {
  createStory();
  createBranch();
  createSnapshot();
});

// Either all succeed, or all rollback
// No partial states exist
```

The database ensures that the "universe" (story + branches + snapshots) is either completely created or doesn't exist at all. This is the **aggregate root creation** pattern—Story is the aggregate root, and Branch/Snapshot are entities within that aggregate.

## What's Next

### Interactive Visualization

I want to make writing more interactive. Added a `canvas_positions` table to store visual layout (already done):
```sql
CREATE TABLE canvas_positions (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  x INTEGER,
  y INTEGER,
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id)
);
```

This allows branches to be displayed as a mind map or timeline. Other canvas features are still in development.

### Future Directions

- Complete canvas UI implementation
- Learn about graph databases (Neo4j, etc.)
- Better diff view between branches
- Search optimization
