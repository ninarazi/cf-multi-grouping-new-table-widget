# cplace NextGen Platform - Advanced Table Aggregator

## Overview
This application is a high-fidelity, interactive table widget built for the **cplace NextGen Platform**. It focuses on advanced data manipulation, multi-level grouping, and real-time ad-hoc aggregations (math calculations) based on user selection.

## Tech Stack
- **Framework:** React 19 (ESM via esm.sh)
- **Styling:** Tailwind CSS
- **Icons:** Lucide-React + Custom Brand SVGs
- **Font:** Roboto Condensed (Weights 100-900)
- **Data:** TypeScript-defined mock data structures

## Core Features

### 1. Multi-Level Grouping (Technical Specifications)
The grouping engine is designed for arbitrary depth and high-performance rendering.

- **Recursive Tree Construction:** 
  - The application maintains an `activeGroups: string[]` state which defines the hierarchy.
  - A recursive `build` function traverses the dataset, grouping rows by the current key, then recursively grouping the remaining data using the next keys in the array.
  - Each node in the tree is typed as a `TableNode` (`GroupNode`, `RowNode`, or `TotalNode`).
- **Dynamic Flattening Logic:**
  - The tree is flattened into a linear list (`flattenedList`) only when needed for rendering.
  - Visibility is controlled by an `expandedIds: Set<string>` state. Only children of nodes present in this set are included in the flattened output.
- **Group Sorting:**
  - Each grouping level maintains its own sort order (`groupSortOrders: Record<string, 'asc' | 'desc'>`).
  - Sorting is applied during the tree construction phase, ensuring that group headers appear in the correct alphanumeric order.
- **Visual Hierarchy & Indentation:**
  - Each node carries a `level` property.
  - CSS-based indentation is calculated as `level * 24px`.
  - Group nodes feature a "chevron" toggle and a dynamic item count suffix `(n)`.
- **Automated Totals Injection (Currently Disabled):**
  - The logic for injecting "Total" nodes into the `flattenedList` is present but suppressed via the `ENABLE_CALCULATIONS` feature flag.

### 2. Interaction & Selection
- **Cell Selection:** Clicking numeric cells or the "Name" column selects them. Selected cells feature a 2px #0078BD border and #E6F2F9 background.
- **Row Selection:** Supports single rows, group-level selection (which propagates to all recursive children), and a master checkbox.
- **Selection Persistence:** A global click listener handles automatic deselection when clicking outside the widget boundaries.

### 3. Real-Time Ad-Hoc Math (Math Bar - Currently Disabled)
- **State-Driven Stats:** The computation of `Sum`, `Average`, `Min`, `Max`, and `Count` is suppressed via the `ENABLE_CALCULATIONS` feature flag.
- **Unit Validation:** Strict unit consistency checks are integrated but inactive while calculations are disabled.

### 4. Workspace Navigation (Sidebar)
- A persistent 56px (w-14) sidebar.
- **Brand Theming:** 
  - Top Level: Menu/Hamburger.
  - Workspace 1: Coffee Icon (`#00A3FF`).
  - Workspace 2: Custom Pin/Logo Icon (`#005E94`).

### 5. Column Management
- **Resizing:** Uses `onMouseDown` with global `mousemove` listeners for smooth width adjustments.
- **Context Menus:** Functional column headers provide grouping/sorting/filtering controls without cluttering the main UI.

## Design System & UX
- **Primary Color:** `#0078BD` (cplace Blue)
- **Density:** 34px row height (Compact Mode).
- **Typography:** "Roboto Condensed" is used for its high readability in data-heavy environments.
- **Accessibility:** Interactive elements include visual hover states (`tr-hover`) and ARIA-compliant checkbox patterns.

## Performance Considerations
- All heavy computations (tree building, list flattening, math stats) are wrapped in `useMemo`.
- The UI relies on CSS `table-fixed` layout to prevent layout shifts during column resizing or group expansion.
- Event propagation is strictly managed using `e.stopPropagation()` to ensure nested interactions (like checkboxes inside group rows) don't trigger parent row clicks.

## Configuration (Feature Flags)
- `ENABLE_CALCULATIONS`: Set to `false` to suppress all math and aggregation logic. Retrieve later by setting to `true`.