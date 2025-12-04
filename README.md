<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Whop Course Analyzer

This tool analyzes Whop course content and extracts key information like course structure, lessons, and metadata.

## Features
- Extract course structure
- Analyze lesson content
- Generate course summaries
- Export data in various formats

## Usage
1. Install dependencies: `npm install`
2. Run the analyzer: `node index.js`
3. View results in the output directory

## Configuration
The `.openspec/config.json` file contains the project configuration.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`