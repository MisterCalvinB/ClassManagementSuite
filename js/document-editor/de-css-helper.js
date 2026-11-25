// ── Document Editor: Interactive CSS Helper & Tutorial ─────────────────────────
(function () {
  'use strict';

  function _t(key, fallback) {
    return (window.t && typeof window.t === 'function') ? window.t(key, fallback) : fallback;
  }

  function _esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Reference Data: CSS Properties ───────────────────────────────────────────
  const CSS_PROPERTIES = [
    // Typography
    {
      name: 'font-family',
      cat: 'typography',
      meaning: 'Sets the typeface used for text inside the selected element.',
      syntax: 'body { font-family: "Lexend", sans-serif; }',
      options: [
        { value: '"Lexend", sans-serif', meaning: 'Clean, accessible modern sans-serif font' },
        { value: 'Georgia, serif', meaning: 'Classic serif font, great for essays and reading' },
        { value: '"Courier New", monospace', meaning: 'Fixed-width font for code, math tables, or fill-ins' },
        { value: 'Arial, Helvetica, sans-serif', meaning: 'Standard neutral sans-serif fallback' }
      ]
    },
    {
      name: 'font-size',
      cat: 'typography',
      meaning: 'Controls the height/size of text characters.',
      syntax: 'h1 { font-size: 24pt; }',
      options: [
        { value: '11pt', meaning: 'Standard readable print body size (approx. 14.5px)' },
        { value: '16px', meaning: 'Standard web/screen base text size' },
        { value: '1.5em', meaning: '1.5 times the parent element font size (relative)' },
        { value: '0.85rem', meaning: '85% of the root document font size (good for footnotes)' }
      ]
    },
    {
      name: 'font-weight',
      cat: 'typography',
      meaning: 'Controls how thick or bold the characters appear.',
      syntax: '.important { font-weight: 700; }',
      options: [
        { value: '400', meaning: 'Normal regular weight' },
        { value: '500', meaning: 'Medium weight — slightly stronger than normal' },
        { value: '600', meaning: 'Semi-bold — great for subheadings and labels' },
        { value: '700', meaning: 'Bold — standard emphasis weight' },
        { value: '800', meaning: 'Extra-bold — heavy display headings' }
      ]
    },
    {
      name: 'font-style',
      cat: 'typography',
      meaning: 'Sets whether text is upright or slanted (italic).',
      syntax: 'blockquote { font-style: italic; }',
      options: [
        { value: 'normal', meaning: 'Standard upright text (resets inherited italic)' },
        { value: 'italic', meaning: 'Slanted italic style for quotes, terms, or captions' }
      ]
    },
    {
      name: 'line-height',
      cat: 'typography',
      meaning: 'Sets the vertical spacing between lines of text.',
      syntax: 'p { line-height: 1.6; }',
      options: [
        { value: '1.2', meaning: 'Tight spacing — best for large headings' },
        { value: '1.5', meaning: 'Balanced reading spacing for body paragraphs' },
        { value: '1.8', meaning: 'Airy spacing — leaves room for student annotations' },
        { value: '2', meaning: 'Double-spaced — ideal for drafts and teacher marking' }
      ]
    },
    {
      name: 'letter-spacing',
      cat: 'typography',
      meaning: 'Adjusts horizontal space between individual characters.',
      syntax: 'h2 { letter-spacing: 0.05em; }',
      options: [
        { value: 'normal', meaning: 'Default font character spacing' },
        { value: '0.05em', meaning: 'Slightly wider — improves uppercase heading readability' },
        { value: '1.5px', meaning: 'Noticeably spaced out for badges or section labels' },
        { value: '-0.02em', meaning: 'Slightly tighter for large display titles' }
      ]
    },
    {
      name: 'text-align',
      cat: 'typography',
      meaning: 'Aligns text horizontally inside its container.',
      syntax: 'h1 { text-align: center; }',
      options: [
        { value: 'left', meaning: 'Aligns text to the left edge (default)' },
        { value: 'center', meaning: 'Centers text horizontally (titles, captions)' },
        { value: 'right', meaning: 'Aligns text to the right edge (dates, scores)' },
        { value: 'justify', meaning: 'Stretches lines to align both left and right edges' }
      ]
    },
    {
      name: 'text-decoration',
      cat: 'typography',
      meaning: 'Adds or removes decorative lines on text.',
      syntax: 'a { text-decoration: none; }',
      options: [
        { value: 'none', meaning: 'Removes underlines (often used on links)' },
        { value: 'underline', meaning: 'Draws a line under the text' },
        { value: 'line-through', meaning: 'Draws a strikethrough line across the text' }
      ]
    },
    {
      name: 'text-transform',
      cat: 'typography',
      meaning: 'Changes letter capitalization without editing the source text.',
      syntax: 'th { text-transform: uppercase; }',
      options: [
        { value: 'none', meaning: 'Keeps original capitalization' },
        { value: 'uppercase', meaning: 'ALL LETTERS CAPITALIZED (great for table headers)' },
        { value: 'lowercase', meaning: 'all letters lowercase' },
        { value: 'capitalize', meaning: 'Capitalizes The First Letter Of Each Word' }
      ]
    },

    // Colors & Background
    {
      name: 'color',
      cat: 'colors',
      meaning: 'Sets the foreground color of text.',
      syntax: 'h1 { color: #222222; }',
      options: [
        { value: '#222222', meaning: 'Soft dark charcoal (easier to read than pure #000)' },
        { value: '#475569', meaning: 'Muted slate gray for subtitles and metadata' },
        { value: '#1d4ed8', meaning: 'Deep blue for links or key terms' },
        { value: '#b91c1c', meaning: 'Crimson red for warnings or corrections' }
      ]
    },
    {
      name: 'background-color',
      cat: 'colors',
      meaning: 'Fills the background behind an element (inside its border).',
      syntax: '.note { background-color: #f5f5f0; }',
      options: [
        { value: 'transparent', meaning: 'No background fill (shows parent background)' },
        { value: '#f5f5f0', meaning: 'Warm neutral paper tint' },
        { value: '#fef9c3', meaning: 'Soft yellow highlight for callouts or key formulas' },
        { value: '#f0f9ff', meaning: 'Soft sky tint for info boxes or examples' }
      ]
    },
    {
      name: 'background',
      cat: 'colors',
      meaning: 'Shorthand for background color, gradients, or images.',
      syntax: '.banner { background: linear-gradient(90deg, #f5f5f0, #e2c96e); }',
      options: [
        { value: '#ffffff', meaning: 'Solid white background' },
        { value: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', meaning: 'Subtle diagonal two-tone gradient' }
      ]
    },
    {
      name: 'opacity',
      cat: 'colors',
      meaning: 'Controls transparency of the entire element (0 = invisible, 1 = solid).',
      syntax: '.watermark { opacity: 0.5; }',
      options: [
        { value: '1', meaning: 'Fully opaque (100% visible)' },
        { value: '0.75', meaning: 'Slightly faded (75% visible)' },
        { value: '0.5', meaning: 'Half transparent (good for subtle watermarks)' },
        { value: '0', meaning: 'Completely invisible (still occupies layout space)' }
      ]
    },

    // Box Model & Spacing
    {
      name: 'margin',
      cat: 'spacing',
      meaning: 'Adds outer space OUTSIDE the element border, pushing neighbors away.',
      syntax: '.card { margin: 16px 0; }',
      options: [
        { value: '0', meaning: 'Removes all default outer spacing' },
        { value: '12px', meaning: '12px space on all four sides' },
        { value: '16px 0', meaning: '16px top & bottom, 0 left & right' },
        { value: '0 auto', meaning: 'Centers a block element horizontally when it has a width' }
      ]
    },
    {
      name: 'padding',
      cat: 'spacing',
      meaning: 'Adds inner breathing room INSIDE the element border, around its content.',
      syntax: '.box { padding: 12px 16px; }',
      options: [
        { value: '0', meaning: 'No inner padding' },
        { value: '8px', meaning: 'Compact 8px padding on all sides' },
        { value: '12px 16px', meaning: '12px top/bottom, 16px left/right (great for callouts)' },
        { value: '6px 12px 6px 16px', meaning: 'Top, Right, Bottom, Left (clockwise order)' }
      ]
    },
    {
      name: 'width',
      cat: 'spacing',
      meaning: 'Sets the horizontal width of an element.',
      syntax: 'table { width: 100%; }',
      options: [
        { value: 'auto', meaning: 'Sizes automatically to fit content (default)' },
        { value: '100%', meaning: 'Stretches across the full width of its parent container' },
        { value: '50%', meaning: 'Half of the parent container width' },
        { value: '240px', meaning: 'Fixed 240 pixels wide' }
      ]
    },
    {
      name: 'max-width',
      cat: 'spacing',
      meaning: 'Limits how wide an element can grow, keeping it responsive on narrow pages.',
      syntax: 'img { max-width: 100%; }',
      options: [
        { value: '100%', meaning: 'Prevents images or tables from overflowing the page' },
        { value: '680px', meaning: 'Comfortable reading column width' }
      ]
    },
    {
      name: 'height',
      cat: 'spacing',
      meaning: 'Sets the vertical height of an element (useful for student answer boxes).',
      syntax: '.answer-box { height: 80px; }',
      options: [
        { value: 'auto', meaning: 'Grows vertically to fit content (default)' },
        { value: '60px', meaning: 'Fixed 60px tall (e.g. short written answer space)' },
        { value: '120px', meaning: 'Fixed 120px tall (e.g. diagram or paragraph box)' }
      ]
    },
    {
      name: 'box-sizing',
      cat: 'spacing',
      meaning: 'Controls whether padding and border are included inside width/height.',
      syntax: '* { box-sizing: border-box; }',
      options: [
        { value: 'border-box', meaning: 'Width includes padding & border (recommended — prevents overflow)' },
        { value: 'content-box', meaning: 'Width applies only to inner content; padding/border add extra size' }
      ]
    },

    // Borders & Shadows
    {
      name: 'border',
      cat: 'borders',
      meaning: 'Draws an outline around all four sides of an element: width, style, and color.',
      syntax: '.box { border: 2px solid #333333; }',
      options: [
        { value: '1px solid #cbd5e1', meaning: 'Thin subtle gray border' },
        { value: '2px solid #333333', meaning: 'Crisp dark charcoal Neobrutalist border' },
        { value: '1.5px dashed #64748b', meaning: 'Dashed border (great for cut-out cards or answer areas)' },
        { value: 'none', meaning: 'Removes any default border' }
      ]
    },
    {
      name: 'border-left',
      cat: 'borders',
      meaning: 'Styles only the left edge — classic for callout boxes and blockquotes.',
      syntax: '.callout { border-left: 4px solid #5b8fcc; }',
      options: [
        { value: '4px solid #5b8fcc', meaning: 'Thick blue accent bar on the left' },
        { value: '4px solid #e2c96e', meaning: 'Thick amber accent bar for warnings or tips' }
      ]
    },
    {
      name: 'border-radius',
      cat: 'borders',
      meaning: 'Rounds the corners of an element.',
      syntax: '.card { border-radius: 8px; }',
      options: [
        { value: '0', meaning: 'Sharp 90-degree square corners' },
        { value: '6px', meaning: 'Softly rounded corners for boxes and buttons' },
        { value: '10px', meaning: 'Comfortable card corner radius' },
        { value: '999px', meaning: 'Full pill / capsule shape (for small badges)' }
      ]
    },
    {
      name: 'box-shadow',
      cat: 'borders',
      meaning: 'Adds a shadow behind an element (offset X, offset Y, blur, color).',
      syntax: '.card { box-shadow: 3px 3px 0 #555555; }',
      options: [
        { value: '3px 3px 0 #555555', meaning: 'Crisp zero-blur Neobrutalist offset shadow' },
        { value: '0 2px 6px rgba(0,0,0,0.08)', meaning: 'Soft subtle elevation shadow' },
        { value: 'none', meaning: 'Removes shadow' }
      ]
    },

    // Layout & Display
    {
      name: 'display',
      cat: 'layout',
      meaning: 'Defines how an element behaves in layout flow (block, inline, flex, grid, or hidden).',
      syntax: '.row { display: flex; }',
      options: [
        { value: 'block', meaning: 'Takes full width and starts on a new line (div, p, h1)' },
        { value: 'inline', meaning: 'Flows inside text without line breaks; ignores width/height (span)' },
        { value: 'inline-block', meaning: 'Flows inline like text, but respects width, height & padding' },
        { value: 'flex', meaning: 'Flexible 1D row or column layout for side-by-side items' },
        { value: 'grid', meaning: '2D grid layout with rows and columns' },
        { value: 'none', meaning: 'Completely hides the element and removes its space' }
      ]
    },
    {
      name: 'position',
      cat: 'layout',
      meaning: 'Controls how an element is positioned in the document (normal flow vs offset/pinned).',
      syntax: '.badge { position: absolute; top: 8px; right: 8px; }',
      options: [
        { value: 'static', meaning: 'Default normal document flow (ignores top/left/right/bottom)' },
        { value: 'relative', meaning: 'Stays in normal flow, but can be nudged with top/left and anchors absolute children' },
        { value: 'absolute', meaning: 'Removed from flow and positioned relative to nearest positioned (relative) ancestor' },
        { value: 'fixed', meaning: 'Pinned to the viewport/printed page (stays in place when scrolling)' },
        { value: 'sticky', meaning: 'Scrolls normally until reaching a threshold (e.g. top: 0), then sticks' }
      ]
    },
    {
      name: 'top / right / bottom / left',
      cat: 'layout',
      meaning: 'Sets the offset distance from an edge when position is relative, absolute, fixed, or sticky.',
      syntax: '.corner-tag { position: absolute; top: 10px; right: 12px; }',
      options: [
        { value: '0', meaning: 'Flushes the element directly against that edge' },
        { value: '12px', meaning: 'Offsets the element 12px inward from that edge' },
        { value: '50%', meaning: 'Offsets by half the parent size (often paired with transform to center)' },
        { value: 'auto', meaning: 'Default automatic edge positioning' }
      ]
    },
    {
      name: 'z-index',
      cat: 'layout',
      meaning: 'Controls stacking order (front-to-back) when positioned elements overlap.',
      syntax: '.overlay-label { position: relative; z-index: 10; }',
      options: [
        { value: 'auto', meaning: 'Default stacking order based on HTML order' },
        { value: '10', meaning: 'Places element above normal content (requires position other than static)' },
        { value: '-1', meaning: 'Sends element behind normal content (useful for background watermarks)' }
      ]
    },
    {
      name: 'flex-direction',
      cat: 'layout',
      meaning: 'Sets whether items inside a display: flex container flow horizontally or vertically.',
      syntax: '.stack { display: flex; flex-direction: column; gap: 8px; }',
      options: [
        { value: 'row', meaning: 'Left-to-right horizontal row (default)' },
        { value: 'column', meaning: 'Top-to-bottom vertical stack' },
        { value: 'row-reverse', meaning: 'Right-to-left horizontal row' },
        { value: 'column-reverse', meaning: 'Bottom-to-top vertical stack' }
      ]
    },
    {
      name: 'flex-wrap',
      cat: 'layout',
      meaning: 'Controls whether flex items stay on one line or wrap onto new lines when space runs out.',
      syntax: '.tags { display: flex; flex-wrap: wrap; gap: 6px; }',
      options: [
        { value: 'nowrap', meaning: 'Forces all items onto a single line (default)' },
        { value: 'wrap', meaning: 'Allows items to wrap cleanly onto the next line' }
      ]
    },
    {
      name: 'overflow',
      cat: 'layout',
      meaning: 'Controls what happens when content is too large for its container box.',
      syntax: '.code-box { max-width: 100%; overflow: auto; }',
      options: [
        { value: 'visible', meaning: 'Content spills outside the box if too large (default)' },
        { value: 'hidden', meaning: 'Clips any content that extends past the box edges' },
        { value: 'auto', meaning: 'Adds scrollbars only when content overflows' },
        { value: 'scroll', meaning: 'Always shows scrollbars' }
      ]
    },
    {
      name: 'visibility',
      cat: 'layout',
      meaning: 'Hides or shows an element while still keeping its blank space in the layout.',
      syntax: '.answer-key { visibility: hidden; }',
      options: [
        { value: 'visible', meaning: 'Element is visible (default)' },
        { value: 'hidden', meaning: 'Invisible, but still reserves its height/width (unlike display: none)' }
      ]
    },
    {
      name: 'float',
      cat: 'layout',
      meaning: 'Pushes an element (like a diagram or note box) to the left or right so text wraps around it.',
      syntax: 'img.side { float: right; margin: 0 0 12px 16px; }',
      options: [
        { value: 'none', meaning: 'No floating; element stays in normal flow (default)' },
        { value: 'left', meaning: 'Floats to the left; following text wraps on the right' },
        { value: 'right', meaning: 'Floats to the right; following text wraps on the left' }
      ]
    },
    {
      name: 'white-space',
      cat: 'typography',
      meaning: 'Controls how spaces, tabs, and line breaks are handled inside text.',
      syntax: '.no-break { white-space: nowrap; }',
      options: [
        { value: 'normal', meaning: 'Collapses extra spaces and wraps lines normally (default)' },
        { value: 'nowrap', meaning: 'Prevents text from wrapping onto a second line' },
        { value: 'pre-wrap', meaning: 'Preserves typed spaces/newlines while still wrapping long lines' }
      ]
    },
    {
      name: 'gap',
      cat: 'layout',
      meaning: 'Sets the spacing between items inside a flex or grid container.',
      syntax: '.row { display: flex; gap: 16px; }',
      options: [
        { value: '8px', meaning: 'Compact gap between chips or small items' },
        { value: '16px', meaning: 'Standard gap between side-by-side columns' },
        { value: '24px', meaning: 'Wide separation between worksheet sections' }
      ]
    },
    {
      name: 'justify-content',
      cat: 'layout',
      meaning: 'Aligns flex/grid items along the main (horizontal) axis.',
      syntax: '.header-row { display: flex; justify-content: space-between; }',
      options: [
        { value: 'flex-start', meaning: 'Packs items at the start (left)' },
        { value: 'center', meaning: 'Centers items horizontally' },
        { value: 'space-between', meaning: 'Pushes first item left and last item right (great for headers)' },
        { value: 'flex-end', meaning: 'Packs items at the end (right)' }
      ]
    },
    {
      name: 'align-items',
      cat: 'layout',
      meaning: 'Aligns flex/grid items along the cross (vertical) axis.',
      syntax: '.header-row { display: flex; align-items: center; }',
      options: [
        { value: 'stretch', meaning: 'Stretches items to equal height (default)' },
        { value: 'center', meaning: 'Vertically centers items with each other' },
        { value: 'flex-start', meaning: 'Aligns items to the top edge' }
      ]
    },
    {
      name: 'grid-template-columns',
      cat: 'layout',
      meaning: 'Defines the number and width of columns in a CSS Grid container.',
      syntax: '.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }',
      options: [
        { value: '1fr 1fr', meaning: 'Two equal-width columns (50% / 50%)' },
        { value: '1fr 1fr 1fr', meaning: 'Three equal-width columns' },
        { value: '2fr 1fr', meaning: 'Two columns where the left is twice as wide as the right' },
        { value: '180px 1fr', meaning: 'Fixed 180px sidebar + flexible main column' }
      ]
    },

    // Tables & Lists
    {
      name: 'border-collapse',
      cat: 'tables',
      meaning: 'Controls whether adjacent table cell borders merge into one clean line or stay separate.',
      syntax: 'table { border-collapse: collapse; }',
      options: [
        { value: 'collapse', meaning: 'Merges cell borders into single crisp lines (recommended)' },
        { value: 'separate', meaning: 'Keeps a gap between each cell border' }
      ]
    },
    {
      name: 'vertical-align',
      cat: 'tables',
      meaning: 'Aligns content vertically inside table cells or inline elements.',
      syntax: 'td { vertical-align: top; }',
      options: [
        { value: 'top', meaning: 'Aligns cell text to the top (best for multi-line cells)' },
        { value: 'middle', meaning: 'Centers cell text vertically (default in tables)' },
        { value: 'bottom', meaning: 'Aligns cell text to the bottom' }
      ]
    },
    {
      name: 'list-style-type',
      cat: 'tables',
      meaning: 'Changes the bullet or numbering marker on lists (ul / ol).',
      syntax: 'ol.alpha { list-style-type: upper-alpha; }',
      options: [
        { value: 'disc', meaning: 'Solid round bullet (default for ul)' },
        { value: 'square', meaning: 'Square bullet marker' },
        { value: 'decimal', meaning: 'Numbers: 1, 2, 3 (default for ol)' },
        { value: 'upper-alpha', meaning: 'Uppercase letters: A, B, C (great for MCQs)' },
        { value: 'lower-roman', meaning: 'Lowercase Roman numerals: i, ii, iii' },
        { value: 'none', meaning: 'Hides bullets/numbers completely' }
      ]
    },

    // Print & Page Breaks
    {
      name: 'break-before',
      cat: 'print',
      meaning: 'Forces or prevents a page break right BEFORE an element when printing or exporting PDF.',
      syntax: '.new-section { break-before: page; page-break-before: always; }',
      options: [
        { value: 'page', meaning: 'Starts this element on a fresh new page' },
        { value: 'auto', meaning: 'Default automatic page flow' }
      ]
    },
    {
      name: 'break-inside',
      cat: 'print',
      meaning: 'Prevents a question card, table row, or callout box from being split across two pages.',
      syntax: '.question-card { break-inside: avoid; page-break-inside: avoid; }',
      options: [
        { value: 'avoid', meaning: 'Keeps the whole box together on one page' },
        { value: 'auto', meaning: 'Allows splitting across pages if needed' }
      ]
    },
    {
      name: 'break-after',
      cat: 'print',
      meaning: 'Forces a page break immediately AFTER an element when printing or exporting PDF.',
      syntax: '.end-of-part { break-after: page; page-break-after: always; }',
      options: [
        { value: 'page', meaning: 'Ends the current page right after this element' },
        { value: 'auto', meaning: 'Default automatic page flow' }
      ]
    },
    {
      name: 'min-width / min-height',
      cat: 'spacing',
      meaning: 'Sets a minimum width or height so a box never shrinks below a readable size.',
      syntax: '.answer-area { min-height: 70px; }',
      options: [
        { value: '70px', meaning: 'Ensures at least 70px height (still grows if content is taller)' },
        { value: '120px', meaning: 'Minimum width for compact badges or table columns' }
      ]
    },
    {
      name: 'max-height',
      cat: 'spacing',
      meaning: 'Caps the maximum vertical height of an element (often paired with overflow: auto).',
      syntax: 'img.diagram { max-height: 240px; }',
      options: [
        { value: '240px', meaning: 'Prevents tall images from pushing content onto another page' },
        { value: 'none', meaning: 'No height limit (default)' }
      ]
    },
    {
      name: 'flex',
      cat: 'layout',
      meaning: 'Shorthand for how a child item grows or shrinks inside a display: flex row or column.',
      syntax: '.col { flex: 1; }',
      options: [
        { value: '1', meaning: 'Shares available space equally with other flex: 1 siblings' },
        { value: '2', meaning: 'Takes twice as much space as a flex: 1 sibling' },
        { value: '0 0 200px', meaning: 'Fixed 200px column that does not grow or shrink' }
      ]
    },
    {
      name: 'align-self',
      cat: 'layout',
      meaning: 'Overrides align-items for one individual item inside a flex or grid container.',
      syntax: '.badge-right { align-self: flex-start; }',
      options: [
        { value: 'flex-start', meaning: 'Pins this item to the top/start edge' },
        { value: 'center', meaning: 'Centers this single item vertically' },
        { value: 'flex-end', meaning: 'Pins this item to the bottom/end edge' }
      ]
    },
    {
      name: 'object-fit',
      cat: 'layout',
      meaning: 'Controls how an <img> fills its given width and height without stretching.',
      syntax: 'img.avatar { width: 80px; height: 80px; object-fit: cover; }',
      options: [
        { value: 'contain', meaning: 'Fits the whole image inside the box, preserving aspect ratio' },
        { value: 'cover', meaning: 'Fills the box completely and crops excess edges cleanly' },
        { value: 'fill', meaning: 'Stretches image to fit (may distort proportions)' }
      ]
    },
    {
      name: 'aspect-ratio',
      cat: 'spacing',
      meaning: 'Locks a box or image to a fixed width-to-height ratio.',
      syntax: '.card-thumb { width: 100%; aspect-ratio: 16 / 9; }',
      options: [
        { value: '1 / 1', meaning: 'Perfect square' },
        { value: '16 / 9', meaning: 'Widescreen landscape box' },
        { value: '4 / 3', meaning: 'Classic photo/slide ratio' }
      ]
    },
    {
      name: 'border-top / border-bottom',
      cat: 'borders',
      meaning: 'Applies a border only to the top or bottom edge (ideal for headers, totals, and blank lines).',
      syntax: 'h2 { border-bottom: 2px solid #333333; padding-bottom: 4px; }',
      options: [
        { value: '2px solid #333333', meaning: 'Crisp underline divider under section headings' },
        { value: '1px dashed #64748b', meaning: 'Dashed student writing line or cut line' }
      ]
    },
    {
      name: 'outline',
      cat: 'borders',
      meaning: 'Draws a ring outside the border without shifting layout size (great for focus or highlights).',
      syntax: '.selected { outline: 2px solid #5b8fcc; outline-offset: 2px; }',
      options: [
        { value: '2px solid #5b8fcc', meaning: 'Blue highlight ring around an element' },
        { value: 'none', meaning: 'Removes default browser focus outline' }
      ]
    },
    {
      name: 'word-break / overflow-wrap',
      cat: 'typography',
      meaning: 'Controls whether long URLs or unbroken words wrap onto the next line instead of overflowing.',
      syntax: 'td { overflow-wrap: break-word; }',
      options: [
        { value: 'break-word', meaning: 'Breaks long words only when they would overflow the container' },
        { value: 'break-all', meaning: 'Breaks at any character to fit narrow table columns' }
      ]
    },
    {
      name: 'column-count / column-gap',
      cat: 'typography',
      meaning: 'Flows long lists or vocabulary banks into multiple newspaper-style vertical columns.',
      syntax: '.vocab-list { column-count: 2; column-gap: 24px; }',
      options: [
        { value: '2', meaning: 'Splits content automatically into 2 balanced vertical columns' },
        { value: '3', meaning: 'Splits content into 3 columns (great for compact word banks)' }
      ]
    },
    {
      name: 'text-shadow',
      cat: 'typography',
      meaning: 'Adds a subtle shadow behind text characters (offset X, offset Y, blur, color).',
      syntax: '.banner-title { text-shadow: 1px 1px 0 rgba(0,0,0,0.15); }',
      options: [
        { value: '1px 1px 0 rgba(0,0,0,0.15)', meaning: 'Crisp subtle depth on large display titles' },
        { value: 'none', meaning: 'Removes text shadow (default)' }
      ]
    },
    {
      name: 'table-layout',
      cat: 'tables',
      meaning: 'Controls whether table column widths adapt to content or follow fixed/equal widths.',
      syntax: 'table.even { width: 100%; table-layout: fixed; }',
      options: [
        { value: 'auto', meaning: 'Columns resize based on cell text length (default)' },
        { value: 'fixed', meaning: 'Columns obey exact widths (or split evenly) for fast, uniform tables' }
      ]
    },
    {
      name: 'transform',
      cat: 'layout',
      meaning: 'Visually moves, scales, or rotates an element without affecting surrounding layout.',
      syntax: '.stamp { transform: rotate(-6deg); display: inline-block; }',
      options: [
        { value: 'rotate(-6deg)', meaning: 'Tilts element slightly (great for "BONUS" or "DRAFT" stamps)' },
        { value: 'scale(1.05)', meaning: 'Enlarges element by 5%' },
        { value: 'translateY(-2px)', meaning: 'Nudges element 2px upward' }
      ]
    },
    {
      name: 'cursor',
      cat: 'layout',
      meaning: 'Changes the mouse pointer icon when hovering over interactive HTML elements.',
      syntax: 'summary, button { cursor: pointer; }',
      options: [
        { value: 'pointer', meaning: 'Hand icon — signals the element is clickable' },
        { value: 'default', meaning: 'Standard arrow cursor' },
        { value: 'not-allowed', meaning: 'Disabled/blocked indicator' }
      ]
    },
    {
      name: 'user-select',
      cat: 'typography',
      meaning: 'Controls whether users can highlight and copy text inside an element.',
      syntax: '.ui-btn { user-select: none; }',
      options: [
        { value: 'auto', meaning: 'Normal text selection allowed (default)' },
        { value: 'none', meaning: 'Prevents accidental text highlighting on interactive buttons' },
        { value: 'all', meaning: 'Selects the entire text block on a single click' }
      ]
    }
  ];

  // ── Reference Data: HTML Tags & Components ───────────────────────────────────
  const HTML_TAGS = [
    {
      name: '<h1> to <h6>',
      cat: 'text',
      badge: 'Block',
      meaning: 'Document headings from Level 1 (main title) down to Level 6 (smallest subheading).',
      example: '<h1>Lesson 1: Cell Structure</h1>\n<h2>Part A: Key Vocabulary</h2>',
      options: [
        { value: '<h1>', meaning: 'Main document title (largest, usually one per document)' },
        { value: '<h2> / <h3>', meaning: 'Major section and subsection headings' },
        { value: 'border-bottom', meaning: 'Common CSS option to add an underline rule under headings' }
      ]
    },
    {
      name: '<p>',
      cat: 'text',
      badge: 'Block',
      meaning: 'A paragraph of text. Automatically adds vertical spacing above and below.',
      example: '<p>Read the passage carefully and answer the questions below.</p>',
      options: [
        { value: 'margin-bottom', meaning: 'Controls space after each paragraph (e.g. 10px)' },
        { value: 'text-indent', meaning: 'Indents the first line of each paragraph (e.g. 2em)' }
      ]
    },
    {
      name: '<strong>, <em>, <mark>',
      cat: 'text',
      badge: 'Inline',
      meaning: 'Inline text emphasis tags that stay on the same line.',
      example: '<p><strong>Important:</strong> Use <em>exact</em> values and <mark>highlight</mark> your final answer.</p>',
      options: [
        { value: '<strong>', meaning: 'Bold text with strong importance' },
        { value: '<em>', meaning: 'Italicized emphasized text' },
        { value: '<mark>', meaning: 'Yellow highlighted text (customizable with background-color)' }
      ]
    },
    {
      name: '<blockquote>',
      cat: 'text',
      badge: 'Block',
      meaning: 'Indented quotation or teacher note block.',
      example: '<blockquote><p>Note: Show all intermediate steps for full credit.</p></blockquote>',
      options: [
        { value: 'border-left', meaning: 'Adds a vertical accent bar on the left side' },
        { value: 'background-color', meaning: 'Adds a soft tint behind the quote' }
      ]
    },
    {
      name: '<code> & <pre>',
      cat: 'text',
      badge: 'Inline / Block',
      meaning: 'Displays monospace code or preformatted text preserving spaces and line breaks.',
      example: '<p>Type <code>print("Hello")</code> in Python.</p>',
      options: [
        { value: '<code>', meaning: 'Inline monospace snippet inside a sentence' },
        { value: '<pre>', meaning: 'Multi-line preformatted block (keeps indentation & newlines)' }
      ]
    },
    {
      name: '<hr>',
      cat: 'text',
      badge: 'Void',
      meaning: 'Horizontal divider line separating sections of a worksheet or handout.',
      example: '<hr>',
      options: [
        { value: 'border: none; border-top: 2px dashed #94a3b8;', meaning: 'Turns the divider into a dashed cut-here line' }
      ]
    },
    {
      name: '<div>',
      cat: 'containers',
      badge: 'Block',
      meaning: 'Generic block container used to group elements into cards, callouts, or multi-column layouts.',
      example: '<div class="callout">\n  <strong>Tip:</strong> Double-check your units.\n</div>',
      options: [
        { value: 'class="name"', meaning: 'Attaches a reusable CSS class (.name) to style multiple boxes' },
        { value: 'id="unique"', meaning: 'Attaches a unique ID (#unique) to style one specific element' },
        { value: 'style="..."', meaning: 'Applies quick inline CSS directly to this single tag' }
      ]
    },
    {
      name: '<span>',
      cat: 'containers',
      badge: 'Inline',
      meaning: 'Generic inline container for styling a word, badge, or phrase inside a paragraph.',
      example: '<p>Question 1 <span class="pts-badge">5 pts</span></p>',
      options: [
        { value: 'class="badge"', meaning: 'Turns the span into a styled pill or points badge' },
        { value: 'display: inline-block', meaning: 'Allows padding and borders without breaking onto a new line' }
      ]
    },
    {
      name: '<ul>, <ol>, <li>',
      cat: 'lists',
      badge: 'Block',
      meaning: 'Unordered (bulleted) lists, ordered (numbered) lists, and individual list items.',
      example: '<ol>\n  <li>Read the text</li>\n  <li>Answer questions 1 to 3</li>\n</ol>',
      options: [
        { value: '<ul>', meaning: 'Bulleted list (order does not matter)' },
        { value: '<ol>', meaning: 'Numbered or lettered list (steps, questions)' },
        { value: '<li>', meaning: 'Each individual item inside ul or ol' },
        { value: 'type="A" / list-style-type', meaning: 'Uses A, B, C instead of 1, 2, 3' }
      ]
    },
    {
      name: '<table>, <tr>, <th>, <td>',
      cat: 'tables',
      badge: 'Table',
      meaning: 'Structured grid of rows and columns for rubrics, schedules, and vocabulary tables.',
      example: '<table>\n  <thead>\n    <tr><th>Criterion</th><th>Points</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Clarity</td><td>10</td></tr>\n  </tbody>\n</table>',
      options: [
        { value: '<table>', meaning: 'Outer table wrapper' },
        { value: '<thead> / <tbody>', meaning: 'Groups header rows separately from body rows' },
        { value: '<tr>', meaning: 'Table row' },
        { value: '<th> / <td>', meaning: 'Header cell (bold/centered by default) and standard data cell' },
        { value: 'colspan="2" / rowspan="2"', meaning: 'Makes a cell span across multiple columns or rows' }
      ]
    },
    {
      name: '<img>',
      cat: 'media',
      badge: 'Void',
      meaning: 'Embeds an image into the document.',
      example: '<img src="diagram.png" alt="Cell diagram" style="max-width: 75%;">',
      options: [
        { value: 'src="..."', meaning: 'File path or data URL of the image' },
        { value: 'alt="..."', meaning: 'Accessible description shown if image fails to load' },
        { value: 'width / max-width', meaning: 'Controls displayed image size (e.g. 50%, 300px)' }
      ]
    },
    {
      name: '<a>',
      cat: 'media',
      badge: 'Inline',
      meaning: 'Creates a clickable hyperlink to a website, email, or document section.',
      example: '<a href="https://example.org" target="_blank">Reference Guide</a>',
      options: [
        { value: 'href="..."', meaning: 'Destination URL or #anchor-id' },
        { value: 'target="_blank"', meaning: 'Opens link in a new tab/window' }
      ]
    },
    {
      name: '<figure> & <figcaption>',
      cat: 'media',
      badge: 'Block',
      meaning: 'Groups an image or diagram together with its caption so they stay together.',
      example: '<figure>\n  <img src="wave.png" alt="Wave">\n  <figcaption>Figure 1: Wavelength diagram</figcaption>\n</figure>',
      options: [
        { value: 'text-align: center', meaning: 'Centers both the image and its caption' },
        { value: 'break-inside: avoid', meaning: 'Keeps the caption on the same page as the image' }
      ]
    },
    {
      name: '<style>',
      cat: 'doc',
      badge: 'Meta',
      meaning: 'Embeds CSS rules directly inside an HTML document (or use the { } CSS Editor panel).',
      example: '<style>\n  .highlight { background: #fef08a; padding: 2px 6px; }\n</style>',
      options: [
        { value: 'CSS Editor Panel', meaning: 'Recommended in Document Editor — keeps CSS clean and separate' },
        { value: 'Inline <style>', meaning: 'Useful when sharing a single self-contained HTML file' }
      ]
    },
    {
      name: '<details> & <summary>',
      cat: 'containers',
      badge: 'Interactive',
      meaning: 'Creates a collapsible accordion toggle (great for interactive hints or answer keys).',
      example: '<details>\n  <summary>Show Answer Key</summary>\n  <p>Answer: 42 cm</p>\n</details>',
      options: [
        { value: '<summary>', meaning: 'Always-visible clickable title bar' },
        { value: 'open', meaning: 'Attribute (<details open>) to make it expanded by default' }
      ]
    },
    {
      name: '<dl>, <dt>, <dd>',
      cat: 'lists',
      badge: 'Block',
      meaning: 'Definition list pairing vocabulary terms (<dt>) with their definitions (<dd>).',
      example: '<dl>\n  <dt>Osmosis</dt>\n  <dd>Movement of water across a semipermeable membrane.</dd>\n</dl>',
      options: [
        { value: '<dt>', meaning: 'Term name (often styled with font-weight: 700)' },
        { value: '<dd>', meaning: 'Term description (indented by default)' }
      ]
    },
    {
      name: '<sup> & <sub>',
      cat: 'text',
      badge: 'Inline',
      meaning: 'Renders superscript (exponents, footnotes) or subscript (chemical formulas).',
      example: '<p>Water is H<sub>2</sub>O and E = mc<sup>2</sup>.</p>',
      options: [
        { value: '<sup>', meaning: 'Raised smaller text (x², 1st, footnote [1])' },
        { value: '<sub>', meaning: 'Lowered smaller text (H₂O, CO₂, a₁)' }
      ]
    },
    {
      name: '<kbd>',
      cat: 'text',
      badge: 'Inline',
      meaning: 'Represents a keyboard key or shortcut combination.',
      example: '<p>Press <kbd>Ctrl</kbd> + <kbd>S</kbd> to save.</p>',
      options: [
        { value: 'border + box-shadow', meaning: 'Gives <kbd> a tactile 3D keycap look' }
      ]
    },
    {
      name: '<header>, <main>, <footer>',
      cat: 'containers',
      badge: 'Semantic',
      meaning: 'Semantic page regions for top banner, primary content, and bottom notes.',
      example: '<header>\n  <h1>Quiz 3</h1>\n</header>\n<main>\n  <p>Questions...</p>\n</main>',
      options: [
        { value: '<header>', meaning: 'Top title/metadata area of a document or card' },
        { value: '<main>', meaning: 'Primary body content' },
        { value: '<footer>', meaning: 'Bottom credits, date, or page notes' }
      ]
    }
  ];

  // ── Reference Data: Selectors & Patterns ─────────────────────────────────────
  const CSS_SELECTORS = [
    {
      name: 'Element Selector (tag)',
      cat: 'basic',
      meaning: 'Targets every HTML element of that tag type in the document.',
      example: 'h2 {\n  color: #1e293b;\n  border-bottom: 2px solid #cbd5e1;\n  padding-bottom: 4px;\n}',
      options: [
        { value: 'p', meaning: 'Targets all paragraphs' },
        { value: 'h1, h2, h3', meaning: 'Targets multiple heading levels at once (comma-separated)' },
        { value: 'table', meaning: 'Targets all tables in the document' }
      ]
    },
    {
      name: 'Class Selector (.name)',
      cat: 'basic',
      meaning: 'Targets any element with a matching class="..." attribute. Can be reused anywhere.',
      example: '.callout {\n  background: #f0f9ff;\n  border-left: 4px solid #5b8fcc;\n  padding: 12px 16px;\n  border-radius: 6px;\n}',
      options: [
        { value: '.callout', meaning: 'Matches <div class="callout"> or <p class="callout">' },
        { value: '.card.highlight', meaning: 'Matches an element that has BOTH classes' }
      ]
    },
    {
      name: 'ID Selector (#name)',
      cat: 'basic',
      meaning: 'Targets one unique element with a matching id="..." attribute.',
      example: '#exam-header {\n  border-bottom: 3px solid #333333;\n  padding-bottom: 10px;\n  margin-bottom: 18px;\n}',
      options: [
        { value: '#exam-header', meaning: 'Matches <div id="exam-header"> (should be unique per page)' }
      ]
    },
    {
      name: 'Descendant & Child (A B / A > B)',
      cat: 'combinators',
      meaning: 'Targets elements nested inside another specific container.',
      example: '.rubric table th {\n  background: #f1f5f9;\n  font-weight: 700;\n}',
      options: [
        { value: '.box p', meaning: 'Descendant: any <p> anywhere inside .box' },
        { value: '.box > p', meaning: 'Direct child: only <p> directly inside .box (not deeper)' }
      ]
    },
    {
      name: 'Zebra & Position (:nth-child)',
      cat: 'pseudo',
      meaning: 'Targets elements based on their position among siblings (great for table striping).',
      example: 'table tr:nth-child(even) {\n  background-color: #f8fafc;\n}',
      options: [
        { value: ':nth-child(even)', meaning: 'Selects rows 2, 4, 6… (even rows)' },
        { value: ':nth-child(odd)', meaning: 'Selects rows 1, 3, 5… (odd rows)' },
        { value: ':first-child / :last-child', meaning: 'Selects the very first or last item in a group' }
      ]
    },
    {
      name: '@media print',
      cat: 'print',
      meaning: 'Applies CSS rules ONLY when printing or exporting to PDF.',
      example: '@media print {\n  .no-print { display: none; }\n  .question-card { break-inside: avoid; }\n}',
      options: [
        { value: '.no-print { display: none; }', meaning: 'Hides teacher-only notes in exported PDFs' },
        { value: 'break-inside: avoid;', meaning: 'Keeps cards/tables from splitting across PDF pages' }
      ]
    },
    {
      name: 'Universal & Grouping (* / A, B)',
      cat: 'basic',
      meaning: 'Targets every element (*) or applies one rule to multiple selectors separated by commas.',
      example: 'h1, h2, h3 {\n  font-family: "Lexend", sans-serif;\n  color: #222222;\n}',
      options: [
        { value: '*', meaning: 'Universal selector — matches every element (commonly used for box-sizing)' },
        { value: 'h1, h2, h3', meaning: 'Comma list — avoids repeating the same styles' }
      ]
    },
    {
      name: 'Sibling Combinators (A + B / A ~ B)',
      cat: 'combinators',
      meaning: 'Targets elements that come right after another element at the same level.',
      example: 'h2 + p {\n  margin-top: 4px;\n  font-weight: 500;\n}',
      options: [
        { value: 'h2 + p', meaning: 'Adjacent sibling: only the <p> immediately following an <h2>' },
        { value: 'h2 ~ p', meaning: 'General sibling: all <p> elements that follow an <h2> in the same parent' }
      ]
    },
    {
      name: 'Attribute Selectors ([attr])',
      cat: 'basic',
      meaning: 'Targets elements based on HTML attributes like href, type, or custom data-* attributes.',
      example: 'a[href^="https"] {\n  color: #1d4ed8;\n  text-decoration: underline;\n}',
      options: [
        { value: '[type="checkbox"]', meaning: 'Exact match on attribute value' },
        { value: '[href^="https"]', meaning: 'Starts with "https" (external links)' },
        { value: '[href$=".pdf"]', meaning: 'Ends with ".pdf"' }
      ]
    },
    {
      name: 'Pseudo-elements (::before / ::after)',
      cat: 'pseudo',
      meaning: 'Inserts decorative labels, prefixes, or icons before or after an element via CSS.',
      example: '.tip::before {\n  content: "TIP: ";\n  font-weight: 800;\n  color: #0369a1;\n}',
      options: [
        { value: '::before', meaning: 'Adds generated content right before the element text' },
        { value: '::after', meaning: 'Adds generated content right after the element text' },
        { value: '::first-letter', meaning: 'Styles the first letter (e.g. drop cap)' }
      ]
    },
    {
      name: 'Negation (:not())',
      cat: 'pseudo',
      meaning: 'Matches elements that do NOT match a given selector.',
      example: 'li:not(:last-child) {\n  margin-bottom: 6px;\n}',
      options: [
        { value: ':not(:last-child)', meaning: 'Applies spacing to all items except the very last one' },
        { value: ':not(.plain)', meaning: 'Styles all elements except those with class="plain"' }
      ]
    },
    {
      name: 'CSS Variables (:root & var())',
      cat: 'basic',
      meaning: 'Stores reusable colors or sizes in one place so you can update your whole document theme at once.',
      example: ':root {\n  --accent: #5b8fcc;\n}\nh1, .callout { border-color: var(--accent); }',
      options: [
        { value: ':root { --name: value; }', meaning: 'Defines a global CSS variable' },
        { value: 'var(--name)', meaning: 'Reads the variable value anywhere in your stylesheet' }
      ]
    }
  ];

  // ── State ────────────────────────────────────────────────────────────────────
  let _activeTab = 'tutorial';
  let _activeCat = 'all';
  let _searchQuery = '';
  let _rafId = null;

  function getCategoriesForTab(tab) {
    if (tab === 'properties') {
      return [
        { id: 'all', label: _t('deCssHelperCatAll', 'All') },
        { id: 'typography', label: _t('deCssHelperCatTypo', 'Typography') },
        { id: 'colors', label: _t('deCssHelperCatColors', 'Colors & Background') },
        { id: 'spacing', label: _t('deCssHelperCatSpacing', 'Box Model & Spacing') },
        { id: 'borders', label: _t('deCssHelperCatBorders', 'Borders & Shadows') },
        { id: 'layout', label: _t('deCssHelperCatLayout', 'Layout & Display') },
        { id: 'tables', label: _t('deCssHelperCatTables', 'Tables & Lists') },
        { id: 'print', label: _t('deCssHelperCatPrint', 'Print & Page') }
      ];
    }
    if (tab === 'tags') {
      return [
        { id: 'all', label: _t('deCssHelperCatAll', 'All') },
        { id: 'text', label: _t('deCssHelperCatHeadings', 'Headings & Text') },
        { id: 'containers', label: _t('deCssHelperCatContainers', 'Containers') },
        { id: 'lists', label: _t('deCssHelperCatLists', 'Lists') },
        { id: 'tables', label: _t('deCssHelperCatTables', 'Tables') },
        { id: 'media', label: _t('deCssHelperCatMedia', 'Media & Links') },
        { id: 'doc', label: _t('deCssHelperCatDoc', 'Document & Style') }
      ];
    }
    if (tab === 'selectors') {
      return [
        { id: 'all', label: _t('deCssHelperCatAll', 'All') },
        { id: 'basic', label: _t('deCssHelperCatBasic', 'Basic') },
        { id: 'combinators', label: _t('deCssHelperCatComb', 'Combinators') },
        { id: 'pseudo', label: _t('deCssHelperCatPseudo', 'Pseudo-classes') },
        { id: 'print', label: _t('deCssHelperCatPrint', 'Print & Media') }
      ];
    }
    return [];
  }

  function renderTabs() {
    const tabsEl = document.getElementById('css-helper-tabs');
    if (!tabsEl) return;
    const tabs = [
      { id: 'tutorial', label: _t('deCssHelperTabTutorial', 'CSS Basics Tutorial') },
      { id: 'properties', label: _t('deCssHelperTabProps', 'CSS Styles & Properties') },
      { id: 'tags', label: _t('deCssHelperTabTags', 'HTML Tags & Options') },
      { id: 'selectors', label: _t('deCssHelperTabSelectors', 'Selectors & Patterns') }
    ];
    tabsEl.innerHTML = tabs.map(t =>
      `<button type="button" class="cssh-tab${_activeTab === t.id ? ' active' : ''}" data-cssh-tab="${t.id}">${_esc(t.label)}</button>`
    ).join('');
  }

  function renderToolbar() {
    const toolbar = document.getElementById('css-helper-toolbar');
    const chipsEl = document.getElementById('css-helper-cat-chips');
    if (!toolbar || !chipsEl) return;

    if (_activeTab === 'tutorial') {
      toolbar.style.display = 'none';
      return;
    }
    toolbar.style.display = '';
    const cats = getCategoriesForTab(_activeTab);
    chipsEl.innerHTML = cats.map(c =>
      `<button type="button" class="cssh-cat-chip${_activeCat === c.id ? ' active' : ''}" data-cssh-cat="${c.id}">${_esc(c.label)}</button>`
    ).join('');
  }

  function renderTutorialBody() {
    return `
      <div class="cssh-tut-grid">
        <div class="cssh-tut-card">
          <div class="cssh-tut-step-head">
            <span class="cssh-step-num">1</span>
            <h3>${_esc(_t('deCssTutAnatomyTitle', 'Anatomy of a CSS Rule'))}</h3>
          </div>
          <p class="cssh-tut-desc">${_esc(_t('deCssTutAnatomyDesc', 'Every CSS rule picks WHICH elements to style (the selector) and lists WHAT styles to apply (property: value pairs).'))}</p>
          <div class="cssh-anatomy-box">
            <span class="cssh-tok-sel">h1</span> <span class="cssh-tok-punct">{</span><br>
            &nbsp;&nbsp;<span class="cssh-tok-prop">color</span><span class="cssh-tok-punct">:</span> <span class="cssh-tok-val">#1d4ed8</span><span class="cssh-tok-punct">;</span><br>
            &nbsp;&nbsp;<span class="cssh-tok-prop">font-size</span><span class="cssh-tok-punct">:</span> <span class="cssh-tok-val">22pt</span><span class="cssh-tok-punct">;</span><br>
            <span class="cssh-tok-punct">}</span>
          </div>
          <ul class="cssh-tut-list">
            <li><strong>Selector</strong> (<code>h1</code>, <code>.callout</code>, <code>#header</code>): Chooses which HTML tags get styled.</li>
            <li><strong>Property</strong> (<code>color</code>, <code>font-size</code>): The visual attribute you want to change.</li>
            <li><strong>Value</strong> (<code>#1d4ed8</code>, <code>22pt</code>): The chosen setting for that property.</li>
            <li><strong>Punctuation</strong>: Wrap rules in <code>{ ... }</code>, separate property/value with <code>:</code>, and end each line with <code>;</code>.</li>
          </ul>
        </div>

        <div class="cssh-tut-card">
          <div class="cssh-tut-step-head">
            <span class="cssh-step-num">2</span>
            <h3>${_esc(_t('deCssTutBoxModelTitle', 'The CSS Box Model'))}</h3>
          </div>
          <p class="cssh-tut-desc">${_esc(_t('deCssTutBoxModelDesc', 'Every HTML element is a rectangular box made of four layers from outside in:'))}</p>
          <div class="cssh-box-diagram">
            <div class="cssh-bm-margin">
              <span class="cssh-bm-label">margin (outer space)</span>
              <div class="cssh-bm-border">
                <span class="cssh-bm-label">border (outline)</span>
                <div class="cssh-bm-padding">
                  <span class="cssh-bm-label">padding (inner space)</span>
                  <div class="cssh-bm-content">Content (text / image)</div>
                </div>
              </div>
            </div>
          </div>
          <ul class="cssh-tut-list">
            <li><strong>Margin</strong>: Space outside the border separating this box from other elements.</li>
            <li><strong>Border</strong>: Visible line around the box (e.g. <code>2px solid #333</code>).</li>
            <li><strong>Padding</strong>: Breathing room between the border and the text inside.</li>
          </ul>
        </div>

        <div class="cssh-tut-card">
          <div class="cssh-tut-step-head">
            <span class="cssh-step-num">3</span>
            <h3>${_esc(_t('deCssTutUnitsTitle', 'Units & Measurements'))}</h3>
          </div>
          <p class="cssh-tut-desc">${_esc(_t('deCssTutUnitsDesc', 'Choose the right unit depending on whether you are styling for screen or printed PDF:'))}</p>
          <div class="cssh-options-list">
            <div class="cssh-option-row"><code>px</code><span>Pixels — fixed screen unit (e.g. <code>14px</code>, <code>2px</code> border)</span></div>
            <div class="cssh-option-row"><code>pt</code><span>Points — print typography standard (e.g. <code>11pt</code> body, <code>18pt</code> title)</span></div>
            <div class="cssh-option-row"><code>em / rem</code><span>Relative to parent or root font size (e.g. <code>1.5em</code> spacing)</span></div>
            <div class="cssh-option-row"><code>%</code><span>Percentage of parent container width (e.g. <code>width: 100%</code>)</span></div>
            <div class="cssh-option-row"><code>mm / cm</code><span>Physical print dimensions for worksheets and exams</span></div>
          </div>
        </div>

        <div class="cssh-tut-card">
          <div class="cssh-tut-step-head">
            <span class="cssh-step-num">4</span>
            <h3>${_esc(_t('deCssTutWorkflowTitle', 'Using CSS in Document Editor'))}</h3>
          </div>
          <p class="cssh-tut-desc">${_esc(_t('deCssTutWorkflowDesc', 'Three fast ways to style your documents and see live results:'))}</p>
          <ul class="cssh-tut-list">
            <li><strong>Quick Rule bar</strong>: Enter a selector (e.g. <code>h1</code>), pick a property, type a value, and click <strong>+ Add</strong>.</li>
            <li><strong>CSS Editor</strong>: Toggle <strong>CSS Editor</strong> in the bar above to write or edit full CSS rules with syntax highlighting.</li>
            <li><strong>Preview Inspector</strong>: Click any element in the right-hand Preview pane to inspect its tag and tweak its CSS live.</li>
            <li><strong>Interactive Helper</strong>: Switch to the <strong>CSS Styles &amp; Properties</strong> or <strong>HTML Tags</strong> tabs above to browse every option and click to apply!</li>
          </ul>
          <div class="cssh-tut-cta-row">
            <button type="button" class="neo-btn neo-btn-sm cssh-jump-btn" data-cssh-jump="properties">${_esc(_t('deCssTutExploreProps', 'Browse All CSS Styles'))}</button>
            <button type="button" class="neo-btn neo-btn-sm cssh-jump-btn" data-cssh-jump="tags">${_esc(_t('deCssTutExploreTags', 'Browse All HTML Tags'))}</button>
          </div>
        </div>
      </div>
    `;
  }

  function filterItems(list) {
    return list.filter(item => {
      if (_activeCat !== 'all' && item.cat !== _activeCat) return false;
      if (_searchQuery) {
        const q = _searchQuery;
        const inName = (item.name || '').toLowerCase().includes(q);
        const inMeaning = (item.meaning || '').toLowerCase().includes(q);
        const inExample = (item.syntax || item.example || '').toLowerCase().includes(q);
        const inOpts = (item.options || []).some(o =>
          (o.value || '').toLowerCase().includes(q) || (o.meaning || '').toLowerCase().includes(q)
        );
        if (!inName && !inMeaning && !inExample && !inOpts) return false;
      }
      return true;
    });
  }

  function renderPropertiesCards() {
    const items = filterItems(CSS_PROPERTIES);
    if (!items.length) return `<div class="cssh-empty">${_esc(_t('deCssHelperNoMatch', 'No matching CSS styles or tags found.'))}</div>`;

    return '<div class="cssh-grid">' + items.map((item, idx) => {
      const optsHtml = (item.options || []).map(opt => `
        <button type="button" class="cssh-opt-btn" data-cssh-action="use-option" data-cssh-prop="${_esc(item.name)}" data-cssh-val="${_esc(opt.value)}" title="${_esc(_t('deCssHelperUseOptTitle', 'Load into Quick Rule bar'))}">
          <code class="cssh-opt-val">${_esc(opt.value)}</code>
          <span class="cssh-opt-desc">${_esc(opt.meaning)}</span>
        </button>
      `).join('');

      return `
        <div class="cssh-card" data-idx="${idx}">
          <div class="cssh-card-head">
            <code class="cssh-card-name">${_esc(item.name)}</code>
            <span class="cssh-badge cssh-badge-${_esc(item.cat)}">${_esc(item.cat)}</span>
          </div>
          <p class="cssh-card-meaning">${_esc(item.meaning)}</p>
          <div class="cssh-options-block">
            <div class="cssh-options-label">${_esc(_t('deCssHelperOptionsLabel', 'Options & what they mean (click to load):'))}</div>
            <div class="cssh-options-list">${optsHtml}</div>
          </div>
          <div class="cssh-code-box">
            <pre class="cssh-code-pre">${_esc(item.syntax)}</pre>
            <div class="cssh-card-actions">
              <button type="button" class="cssh-act-btn" data-cssh-action="copy">
                <img src="../assets/icons/copy.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperCopy', 'Copy'))}
              </button>
              <button type="button" class="cssh-act-btn cssh-act-primary" data-cssh-action="apply-css">
                <img src="../assets/icons/plus.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperApplyCss', 'Apply to CSS'))}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderTagsCards() {
    const items = filterItems(HTML_TAGS);
    if (!items.length) return `<div class="cssh-empty">${_esc(_t('deCssHelperNoMatch', 'No matching CSS styles or tags found.'))}</div>`;

    return '<div class="cssh-grid">' + items.map(item => {
      const optsHtml = (item.options || []).map(opt => `
        <div class="cssh-option-row">
          <code>${_esc(opt.value)}</code>
          <span>${_esc(opt.meaning)}</span>
        </div>
      `).join('');

      return `
        <div class="cssh-card">
          <div class="cssh-card-head">
            <code class="cssh-card-name">${_esc(item.name)}</code>
            <span class="cssh-badge cssh-badge-tag">${_esc(item.badge || item.cat)}</span>
          </div>
          <p class="cssh-card-meaning">${_esc(item.meaning)}</p>
          <div class="cssh-options-block">
            <div class="cssh-options-label">${_esc(_t('deCssHelperTagOptionsLabel', 'Options, attributes & common styles:'))}</div>
            <div class="cssh-options-list">${optsHtml}</div>
          </div>
          <div class="cssh-code-box">
            <pre class="cssh-code-pre">${_esc(item.example)}</pre>
            <div class="cssh-card-actions">
              <button type="button" class="cssh-act-btn" data-cssh-action="copy">
                <img src="../assets/icons/copy.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperCopy', 'Copy'))}
              </button>
              <button type="button" class="cssh-act-btn cssh-act-primary" data-cssh-action="insert-tag">
                <img src="../assets/icons/plus.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperInsertTag', 'Insert Tag'))}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderSelectorsCards() {
    const items = filterItems(CSS_SELECTORS);
    if (!items.length) return `<div class="cssh-empty">${_esc(_t('deCssHelperNoMatch', 'No matching CSS styles or tags found.'))}</div>`;

    return '<div class="cssh-grid">' + items.map(item => {
      const optsHtml = (item.options || []).map(opt => `
        <div class="cssh-option-row">
          <code>${_esc(opt.value)}</code>
          <span>${_esc(opt.meaning)}</span>
        </div>
      `).join('');

      return `
        <div class="cssh-card">
          <div class="cssh-card-head">
            <code class="cssh-card-name">${_esc(item.name)}</code>
            <span class="cssh-badge cssh-badge-${_esc(item.cat)}">${_esc(item.cat)}</span>
          </div>
          <p class="cssh-card-meaning">${_esc(item.meaning)}</p>
          <div class="cssh-options-block">
            <div class="cssh-options-label">${_esc(_t('deCssHelperSelOptionsLabel', 'Patterns & what they target:'))}</div>
            <div class="cssh-options-list">${optsHtml}</div>
          </div>
          <div class="cssh-code-box">
            <pre class="cssh-code-pre">${_esc(item.example)}</pre>
            <div class="cssh-card-actions">
              <button type="button" class="cssh-act-btn" data-cssh-action="copy">
                <img src="../assets/icons/copy.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperCopy', 'Copy'))}
              </button>
              <button type="button" class="cssh-act-btn cssh-act-primary" data-cssh-action="apply-css">
                <img src="../assets/icons/plus.svg" class="btn-icon" alt="" /> ${_esc(_t('deCssHelperApplyCss', 'Apply to CSS'))}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }

  function renderBody() {
    const body = document.getElementById('css-helper-body');
    if (!body) return;
    if (_activeTab === 'tutorial') {
      body.innerHTML = renderTutorialBody();
    } else if (_activeTab === 'properties') {
      body.innerHTML = renderPropertiesCards();
    } else if (_activeTab === 'tags') {
      body.innerHTML = renderTagsCards();
    } else if (_activeTab === 'selectors') {
      body.innerHTML = renderSelectorsCards();
    }
    body.scrollTop = 0;
  }

  function loadIntoQuickRule(prop, val) {
    const cssPanel = document.getElementById('css-panel');
    if (cssPanel && !cssPanel.classList.contains('open')) {
      cssPanel.classList.add('open');
      const navBtn = document.getElementById('btn-toggle-css-panel');
      if (navBtn) navBtn.classList.add('active');
    }
    const selInput = document.getElementById('rule-selector');
    const propSel = document.getElementById('rule-property');
    const valInput = document.getElementById('rule-value');

    if (propSel) {
      let hasOpt = Array.from(propSel.options).some(o => o.value === prop);
      if (!hasOpt) {
        const opt = document.createElement('option');
        opt.value = prop;
        opt.textContent = prop;
        propSel.appendChild(opt);
      }
      propSel.value = prop;
    }
    if (valInput) valInput.value = val;
    if (selInput && !selInput.value.trim()) selInput.value = 'p';

    close();
    if (selInput) selInput.focus();
    if (window.showToast) {
      window.showToast(_t('deCssHelperLoadedQuickRule', 'Loaded into Quick Rule bar'));
    }
  }

  function handleCopy(btn, text) {
    if (!navigator.clipboard || !text) return;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.textContent = _t('deCssHelperCopied', 'Copied');
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('copied');
      }, 1400);
    }).catch(() => {
      if (window.showToast) window.showToast(_t('deCssHelperCopyErr', 'Could not copy to clipboard'), true);
    });
  }

  function handleApplyCss(code) {
    if (!code) return;
    if (typeof window.applyCssRuleToDoc === 'function') {
      window.applyCssRuleToDoc(code);
      if (typeof window.cssEditorVisible !== 'undefined' && !window.cssEditorVisible && typeof window.toggleCssEditor === 'function') {
        window.toggleCssEditor();
      }
      return;
    }
    if (window.cssEditor) {
      const cur = window.cssEditor.getValue() || '';
      const sep = cur && !cur.endsWith('\n') ? '\n\n' : (cur ? '\n' : '');
      window.cssEditor.setValue(cur + sep + code + '\n');
      if (window.showToast) window.showToast(_t('deAppliedCssToast', 'CSS rule applied to document stylesheet'));
    }
  }

  function handleInsertTag(code) {
    if (!code) return;
    if (typeof window.insertSyntaxSnippet === 'function') {
      close();
      window.insertSyntaxSnippet(code);
      return;
    }
    if (window.mdEditor) {
      const selection = window.mdEditor.getSelection();
      window.mdEditor.executeEdits('css-helper', [{ range: selection, text: code, forceMoveMarkers: true }]);
      window.mdEditor.focus();
      close();
      if (window.showToast) window.showToast(_t('deCssHelperTagInserted', 'Tag inserted at cursor'));
    }
  }

  function bindEventsOnce() {
    const modal = document.getElementById('css-helper-modal');
    if (!modal || modal._csshBound) return;
    modal._csshBound = true;

    const tabsEl = document.getElementById('css-helper-tabs');
    if (tabsEl) {
      tabsEl.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-cssh-tab]');
        if (!btn) return;
        _activeTab = btn.getAttribute('data-cssh-tab');
        _activeCat = 'all';
        _searchQuery = '';
        const searchInput = document.getElementById('css-helper-search');
        if (searchInput) searchInput.value = '';
        renderTabs();
        renderToolbar();
        renderBody();
      });
    }

    const chipsEl = document.getElementById('css-helper-cat-chips');
    if (chipsEl) {
      chipsEl.addEventListener('click', function (e) {
        const chip = e.target.closest('[data-cssh-cat]');
        if (!chip) return;
        _activeCat = chip.getAttribute('data-cssh-cat');
        renderToolbar();
        renderBody();
      });
    }

    const searchInput = document.getElementById('css-helper-search');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        const val = (this.value || '').trim().toLowerCase();
        if (_rafId) cancelAnimationFrame(_rafId);
        _rafId = requestAnimationFrame(() => {
          _rafId = null;
          _searchQuery = val;
          renderBody();
        });
      });
    }

    const body = document.getElementById('css-helper-body');
    if (body) {
      body.addEventListener('click', function (e) {
        const jumpBtn = e.target.closest('[data-cssh-jump]');
        if (jumpBtn) {
          _activeTab = jumpBtn.getAttribute('data-cssh-jump');
          _activeCat = 'all';
          renderTabs();
          renderToolbar();
          renderBody();
          return;
        }

        const actBtn = e.target.closest('[data-cssh-action]');
        if (!actBtn) return;
        const action = actBtn.getAttribute('data-cssh-action');
        if (action === 'use-option') {
          loadIntoQuickRule(actBtn.getAttribute('data-cssh-prop'), actBtn.getAttribute('data-cssh-val'));
          return;
        }
        const codeBox = actBtn.closest('.cssh-code-box');
        const pre = codeBox ? codeBox.querySelector('.cssh-code-pre') : null;
        const code = pre ? pre.textContent : '';
        if (action === 'copy') handleCopy(actBtn, code);
        else if (action === 'apply-css') handleApplyCss(code);
        else if (action === 'insert-tag') handleInsertTag(code);
      });
    }
  }

  function open(defaultTab) {
    if (defaultTab && defaultTab !== _activeTab) {
      _activeTab = defaultTab;
      _activeCat = 'all';
    }
    const searchInput = document.getElementById('css-helper-search');
    if (searchInput) {
      _searchQuery = (searchInput.value || '').trim().toLowerCase();
    }
    bindEventsOnce();
    renderTabs();
    renderToolbar();
    renderBody();
    if (typeof window.showModal === 'function') {
      window.showModal('css-helper-modal');
    } else {
      const m = document.getElementById('css-helper-modal');
      if (m) m.hidden = false;
    }
  }

  function close() {
    if (typeof window.hideModal === 'function') {
      window.hideModal('css-helper-modal');
    } else {
      const m = document.getElementById('css-helper-modal');
      if (m) m.hidden = true;
    }
  }

  window.DeCssHelper = { open, close };
  window.openCssHelperModal = open;
})();
