import sys

def run_logic(commits):
    print("\nRunning logic on commits...")
    for i, line in enumerate(commits):
        print(f"{i+1}. Commit: {line}\n")

    # Example: Check if any commit message contains "WIP"
    has_wip = any("WIP" in line.upper() for line in commits)
    if has_wip:
        print("\n⚠️  Warning: Found 'WIP' in one or more commit messages!")
    else:
        print("\n✅ No 'WIP' commits found.")

if __name__ == "__main__":
    input_data = sys.stdin.read()
    commit_lines = input_data.strip().split("\n")
    run_logic(commit_lines)
