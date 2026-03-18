# SP: Graph Generator and Series-Parallel Recognition Tools

## Overview

This project contains two main components extracted and adapted from Nathan Levy's COMP-4990 project at the University of Windsor. The original project was a C++ implementation of algorithms for determining if graphs are generalized series-parallel, series-parallel, and/or outerplanar.

I extracted and created these standalone tools:

- **Graph Generator** - Generates random biconnected graphs for testing
- **Series-Parallel Recognizer** - Determines if a graph is series-parallel


## Project Structure

```
├── README.md                    
├── graph_generator.cpp          # Graph generator 
├── sp_recognizer.cpp           # Series-parallel recognition tool
```
## Compilation
Demo compilation and execution

g++ -O2 -std=c++17 graph_generator.cpp -o graph_generator 
g++ -std=c++17 -O2 sp_recognition.cpp -o sp_recognition
## Task 1: Graph Generator

### Description

The graph generator creates random biconnected graphs by combining cycle and complete subgraphs in a tree structure. This ensures the generated graphs are connected and biconnected, making them suitable for testing series-parallel recognition algorithms.

### Algorithm Overview

1. Generate `nC` cycle subgraphs of length `lC` and `nK` complete subgraphs of size `lK`
2. Randomly shuffle vertex labels to avoid predictable structure
3. Connect subgraphs in a tree structure using 2 or 3 edges per connection
4. Randomly shuffle all edges to eliminate ordering bias

### Usage

```bash
./graph_generator nC lC nK lK three_edges [seed]
```

**Parameters:**
- `nC`: Number of cycle subgraphs (≥ 0)
- `lC`: Length of each cycle (≥ 3)
- `nK`: Number of complete subgraphs (≥ 0)
- `lK`: Size of each complete subgraph (≥ 3)
- `three_edges`: Connect with 3 edges instead of 2 (0=no, 1=yes)
- `seed`: Random seed (optional, uses current time if omitted)

**Output Format:**
```
n m
u1 v1
u2 v2
...
um vm
```
Where `n` is the number of vertices, `m` is the number of edges, and each subsequent line represents an edge between vertices `ui` and `vi`.

### Examples

```bash
# Generate graph with 3 cycles of length 5, 2 complete graphs of size 4
./graph_generator 3 5 2 4 0 12345

# Generate larger graph with 3-edge connections
./graph_generator 5 8 3 6 1

# Save output to file
./graph_generator 2 4 1 5 0 > my_graph.txt
```

## Task 2: Series-Parallel Recognizer

### Description

The series-parallel recognizer determines whether a given graph has a series-parallel structure. A graph is series-parallel if it can be reduced to a single edge through a sequence of series and parallel reductions, or equivalently, if it contains no K₄ subdivision.

### Algorithm Overview

The recognition algorithm works by:

1. **Biconnected Component Analysis**: Decompose the graph into biconnected components
2. **Structural Validation**: Check that components form a valid tree structure
3. **Ear Decomposition**: Use ear decomposition within each biconnected component
4. **Violation Detection**: Look for forbidden structures:
   - K₄ subdivisions (interlacing ears)
   - Cut vertices in 3+ biconnected components
   - Biconnected components with 3+ cut vertices
   - T₄ subdivisions with cut vertices

### Usage

```bash
./sp_recognizer [input_file]
```

If no input file is provided, reads from standard input.

**Input Format:** Same as graph generator output format.

**Output Format:**
```
Graph is series-parallel: YES
```
or
```
Graph is series-parallel: NO
Reason: [specific violation found]
```

### Examples

```bash
# Test a graph from file
./sp_recognizer graph.txt

# Test using pipe from generator
./graph_generator 2 4 1 3 0 | ./sp_recognizer

# Test with stdin input
./sp_recognizer < input_graph.txt
```
## Technical Details

### Graph Generator Implementation

- **Time Complexity**: O(V + E) where V = nC×lC + nK×lK and E is the number of generated edges
- **Space Complexity**: O(V + E)
- **Randomization**: Uses C-style rand() with configurable seed for reproducibility
- **Output**: Simple edge-list format compatible with most graph analysis tools

### Series-Parallel Recognizer Implementation

- **Time Complexity**: O(V + E) linear time recognition
- **Space Complexity**: O(V + E)
- **Algorithm**: Based on ear decomposition and biconnected component analysis
- **Violation Detection**: Identifies specific non-SP structures with descriptive error messages
