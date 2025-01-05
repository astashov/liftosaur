#!/bin/bash

# Check if the directory argument is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

DIR="$1"

# Check if the provided argument is a directory
if [ ! -d "$DIR" ]; then
    echo "Error: $DIR is not a directory."
    exit 1
fi

# Iterate over all .ttf files in the directory
for file in "$DIR"/*.ttf; do
    # Skip if no .ttf files are found
    [ -e "$file" ] || continue

    # Get the directory and filename separately
    dirpath=$(dirname "$file")
    filename=$(basename "$file")

    # Create a new filename with "-" replaced by "_" and uppercase to lowercase
    new_filename=$(echo "$filename" | tr 'A-Z-' 'a-z_')

    # Rename the file if the new name is different
    if [ "$filename" != "$new_filename" ]; then
        mv "$file" "$dirpath/$new_filename"
        echo "Renamed: $filename -> $new_filename"
    fi
done

echo "Renaming of .ttf files completed."
