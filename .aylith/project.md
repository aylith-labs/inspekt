---
name: Inspekt
tagline: Inspect instrumented elements and find their source
description: >-
  An element inspector for instrumented development projects: Ctrl+Alt+Click an
  element to see its source location and surrounding lines. Copy the path, open
  it in an editor, or hand captured source context to a configured coding agent through a local
  CLI, daemon, and MCP workflow.
category: developer-tools
features:
  - Reveal an instrumented element's source file, line, and column
  - Read surrounding source and copy its location
  - Open the source location in a configured editor
  - Instrument Vite development output without shipping the inspector in production
  - Hand captured source context to a configured coding agent through a local daemon and MCP
  - Keep inspector styling isolated with Shadow DOM
targetUser: >-
  Frontend developers who lose time mapping what they see in the browser back to
  the file that renders it — and who want that context handed to a coding agent
  instead of retyped.
featured: false
order: 23
icon: >-
  m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607
  10.607Z
gradientFrom: '#3b82f6'
gradientTo: '#ec4899'
---

## From an element to its source

Use Ctrl+Alt+Click on an instrumented element to reveal the file, line, and column behind it. Read the surrounding source, copy its location, or open it in your configured editor.

## Keep inspection in development

The Vite plugin adds source locations to your development output. The inspector lives in an isolated Shadow DOM surface and stays out of the production build.

## Give your coding agent the same context

Capture the element's source context into the local handoff queue. A configured MCP client can retrieve the captured record through the local daemon, so you can work from a concrete source location instead of retyping what you saw.
