/**
 * Class Management Tools — Board Welcome Showcase Module
 * Generates an exhaustive, beautifully-crafted default example board demonstrating:
 * - Interactive Nodes (words, shapes, math formulas, countdown timers, random dice, masked cards)
 * - Rich Sticky Notes (lesson checklists, shortcuts cheatsheet, presentation callouts)
 * - Audio Lab (embedded WAV chime, audio node trigger, waveform player widget, speed controls)
 * - Video & Media (embedded WebM clip, video node trigger, full player controls)
 * - Visual Links / Edges (curved bezier, straight, orthogonal stepped, animated flowing dashes, labeled links)
 * - Structured Tables (4x4 matrix grid with headers, formatted cells, and capabilities summary)
 * - Canvas Shapes & Annotations (Neobrutalist highlight frames, directional arrows)
 * - Organized Thematic Groups (color-coded containers grouping each feature domain)
 */

(function (global) {
  'use strict';

  // --- 1. Synthesize Pristine 16-bit PCM WAV Chime Melody on the fly ---
  function generateShowcaseAudioBase64() {
    try {
      const sampleRate = 16000;
      const duration = 1.0;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      function writeStr(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }

      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // Mono channel
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      // Sweet arpeggiated chime chord: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
      const notes = [
        { freq: 523.25, start: 0.0, dur: 0.8 },
        { freq: 659.25, start: 0.15, dur: 0.7 },
        { freq: 783.99, start: 0.3, dur: 0.7 },
        { freq: 1046.50, start: 0.45, dur: 0.55 }
      ];

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let s = 0;
        for (let n = 0; n < notes.length; n++) {
          const note = notes[n];
          if (t >= note.start && t < note.start + note.dur) {
            const dt = t - note.start;
            const env = Math.exp(-4.5 * dt);
            s += 0.22 * Math.sin(2 * Math.PI * note.freq * dt) * env;
          }
        }
        const val = Math.max(-32768, Math.min(32767, Math.floor(s * 32767)));
        view.setInt16(44 + i * 2, val, true);
      }

      let binary = '';
      const bytes = new Uint8Array(buffer);
      const chunkSize = 8192;
      for (let i = 0; i < bytes.byteLength; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      const btoaFn = (typeof btoa === 'function' ? btoa : null) || (typeof window !== 'undefined' ? window.btoa : null) || (typeof globalThis !== 'undefined' ? globalThis.btoa : null);
      if (typeof btoaFn === 'function') {
        return btoaFn(binary);
      }
      const bufCls = (typeof Buffer !== 'undefined' ? Buffer : null) || (typeof globalThis !== 'undefined' ? globalThis.Buffer : null);
      if (bufCls) {
        return bufCls.from(binary, 'binary').toString('base64');
      }
      return '';
    } catch (e) {
      console.warn('[BoardShowcase] Failed to generate procedural audio:', e);
      return '';
    }
  }

  // --- 2. Valid 320x180 25fps VP9 WebM Educational Video Clip ---
  const SHOWCASE_VIDEO_BASE64 =
    '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';

  // --- 3. Build Full Board Session Data ---
  function buildShowcaseSessionData() {
    const audioB64 = generateShowcaseAudioBase64();
    const videoB64 = SHOWCASE_VIDEO_BASE64;

    return {
      _type: 'constellation',
      _version: 1,
      title: '🌟 Welcome to Board — Feature Showcase',
      dateCreated: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      boardHeight: 1550,
      boardBgColor: '#f5f5f0',
      boardBackgroundColor: '#f5f5f0',

      // --- ATTACHMENTS ---
      attachments: [
        {
          id: 'att_showcase_audio',
          name: 'welcome_chime.wav',
          kind: 'sounds',
          mime: 'audio/wav',
          size: 32044,
          base64: audioB64
        },
        {
          id: 'att_showcase_video',
          name: 'welcome_video.webm',
          kind: 'videos',
          mime: 'video/webm',
          size: 7132,
          base64: videoB64
        }
      ],

      // --- NODES ---
      nodes: [
        // Zone 1: Main Title
        {
          id: 'node_hero_title',
          baseWord: '🌟 Welcome to Board!',
          x: 620,
          y: 40,
          w: 380,
          h: 62,
          bg: '#e2c96e',
          color: '#1a1a1a',
          border: '#333333',
          borderWidth: 2,
          fontSize: '24px',
          shape: 'rectangle',
          fmt: { bold: true },
          emoji: '🚀'
        },

        // Zone 2: Concept Nodes & Widgets
        {
          id: 'node_concept_photo',
          baseWord: 'Photosynthesis',
          x: 60,
          y: 495,
          w: 200,
          h: 48,
          bg: '#6abf8e',
          color: '#0f3a22',
          border: '#333333',
          borderWidth: 2,
          fontSize: '16px',
          shape: 'rectangle',
          fmt: { bold: true },
          emoji: '🌱'
        },
        {
          id: 'node_katex_formula',
          baseWord: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
          x: 285,
          y: 495,
          w: 235,
          h: 48,
          bg: '#eff6ff',
          color: '#1e40af',
          border: '#3b82f6',
          borderWidth: 2,
          fontSize: '13px',
          shape: 'oval',
          fmt: { bold: true },
          emoji: '🧪'
        },
        {
          id: 'node_timer_widget',
          baseWord: '⏱️ 05:00 (5 Min Timer)',
          x: 60,
          y: 575,
          w: 200,
          h: 56,
          isTimer: true,
          durationSec: 300,
          remainingSec: 300,
          timerState: 'idle',
          timerTarget: 'board',
          bg: '#fef3c7',
          color: '#92400e',
          border: '#d97706',
          borderWidth: 2,
          fontSize: '14px',
          shape: 'rectangle',
          fmt: { bold: true }
        },
        {
          id: 'node_dice_widget',
          baseWord: '🎲 Roll (1–20): 14',
          x: 285,
          y: 575,
          w: 235,
          h: 56,
          isRandom: true,
          randomMin: 1,
          randomMax: 20,
          randomValue: 14,
          bg: '#f3e8ff',
          color: '#6b21a8',
          border: '#9333ea',
          borderWidth: 2,
          fontSize: '15px',
          shape: 'rectangle',
          fmt: { bold: true }
        },
        {
          id: 'node_masked_mystery',
          baseWord: 'Mitochondria (Powerhouse)',
          x: 150,
          y: 660,
          w: 260,
          h: 50,
          masked: true,
          bg: '#fee2e2',
          color: '#991b1b',
          border: '#dc2626',
          borderWidth: 2,
          fontSize: '15px',
          shape: 'rectangle',
          fmt: { bold: true },
          emoji: '❓'
        },

        // Zone 4: Audio Trigger Node
        {
          id: 'node_audio_trigger',
          baseWord: '🔊 Pronunciation Chime',
          x: 1220,
          y: 360,
          w: 260,
          h: 54,
          isSound: true,
          soundAttachmentId: 'att_showcase_audio',
          soundName: 'welcome_chime.wav',
          soundDuration: 1.0,
          bg: '#e0f2fe',
          color: '#0369a1',
          border: '#0284c7',
          borderWidth: 2,
          fontSize: '15px',
          shape: 'rectangle',
          fmt: { bold: true },
          emoji: '🎵'
        },

        // Zone 5: Video Trigger Node
        {
          id: 'node_video_trigger',
          baseWord: '🎥 Video: Classroom Walkthrough',
          x: 60,
          y: 920,
          w: 320,
          h: 52,
          isVideo: true,
          videoAttachmentId: 'att_showcase_video',
          videoName: 'welcome_video.webm',
          videoDuration: 2.0,
          bg: '#e0e7ff',
          color: '#3730a3',
          border: '#4f46e5',
          borderWidth: 2,
          fontSize: '15px',
          shape: 'rectangle',
          fmt: { bold: true },
          emoji: '📹'
        },

        // Zone 6: Visual Link Nodes
        {
          id: 'node_link_source',
          baseWord: 'Source Concept',
          x: 660,
          y: 930,
          w: 180,
          h: 50,
          bg: '#e2c96e',
          color: '#1a1a1a',
          border: '#333333',
          borderWidth: 2,
          fontSize: '15px',
          shape: 'rectangle',
          fmt: { bold: true }
        },
        {
          id: 'node_link_curved',
          baseWord: 'Curved Target',
          x: 960,
          y: 930,
          w: 180,
          h: 50,
          bg: '#5b8fcc',
          color: '#ffffff',
          border: '#333333',
          borderWidth: 2,
          fontSize: '14px',
          shape: 'circle',
          fmt: { bold: true }
        },
        {
          id: 'node_link_stepped',
          baseWord: 'Orthogonal Result',
          x: 810,
          y: 1060,
          w: 200,
          h: 50,
          bg: '#8b7cc2',
          color: '#ffffff',
          border: '#333333',
          borderWidth: 2,
          fontSize: '14px',
          shape: 'square',
          fmt: { bold: true }
        }
      ],

      // --- STICKY NOTES ---
      notes: [
        // Zone 1: Main Overview Note
        {
          id: 'note_hero_desc',
          x: 520,
          y: 125,
          width: 580,
          height: 145,
          manualSize: true,
          bg: '#ffffff',
          color: '#1f2937',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<div style="line-height:1.5;"><b>Class Management Tools — Interactive Visual Workspace</b><br>' +
            'This example board demonstrates the key features of Board. Explore the interactive zones below:' +
            '<ul style="margin:6px 0 6px 18px;padding:0;font-size:0.86rem;">' +
            '<li><b>Nodes &amp; Widgets:</b> Timers, random pickers, KaTeX math &amp; mystery masked cards.</li>' +
            '<li><b>Rich Notes:</b> Styled cards, lesson checklists, callouts &amp; split notes.</li>' +
            '<li><b>Media Lab:</b> Embedded waveform audio player &amp; video walkthrough player.</li>' +
            '<li><b>Data Tables &amp; Links:</b> Structured matrix grids &amp; animated visual links.</li>' +
            '</ul>' +
            '<span style="font-size:0.8rem;color:#555;">💡 <i>Tip: Double-click any element to edit text. Hold <b>Space + Drag</b> to pan canvas. Scroll to zoom.</i></span></div>'
        },

        // Zone 2: Widgets Guide
        {
          id: 'note_widgets_guide',
          x: 60,
          y: 360,
          width: 460,
          height: 110,
          manualSize: true,
          bg: '#eff6ff',
          color: '#1e3a8a',
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>🔲 Interactive Node Engine:</b><br>' +
            'Nodes are visual concept cards. They can be standard words, KaTeX math expressions, live countdown timers, random dice pickers, or mystery masked cards for classroom questions.'
        },
        {
          id: 'note_masked_hint',
          x: 60,
          y: 735,
          width: 460,
          height: 75,
          manualSize: true,
          bg: '#ffffff',
          color: '#333333',
          borderColor: '#333333',
          borderWidth: 1.5,
          borderStyle: 'solid',
          fontSize: 12,
          html:
            '<b>👆 Click the Masked Node above!</b><br>' +
            'Clicking or hovering over masked elements uncovers them in real time — ideal for retrieval practice, oral exam prompts, and classroom vocabulary guessing.'
        },

        // Zone 3: Checklist & Callouts
        {
          id: 'note_checklist',
          x: 600,
          y: 360,
          width: 270,
          height: 210,
          manualSize: true,
          bg: '#fef9c3',
          color: '#713f12',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>📋 Lesson Agenda &amp; Checklist:</b>' +
            '<ul style="margin:8px 0 0 16px;padding:0;line-height:1.6;">' +
            '<li><b>Phase 1:</b> Vocab retrieval bellringer</li>' +
            '<li><b>Phase 2:</b> Guided concept mindmap</li>' +
            '<li><b>Phase 3:</b> Student tablet interaction</li>' +
            '<li><b>Phase 4:</b> Quick quiz &amp; exit ticket</li>' +
            '</ul>' +
            '<div style="margin-top:10px;padding:4px 8px;background:#fef08a;border-radius:4px;border:1px solid #ca8a04;font-size:0.75rem;">' +
            '✅ <i>All 4 phases synced with Lesson Planner</i></div>'
        },
        {
          id: 'note_callout_rules',
          x: 890,
          y: 360,
          width: 270,
          height: 210,
          manualSize: true,
          bg: '#ffedd5',
          color: '#7c2d12',
          borderColor: '#ea580c',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>⚡ Presentation Mode:</b><br><br>' +
            'Project this board onto a second display or classroom projector with <b>Presentation Mode</b> (top-right display icon).<br><br>' +
            'Teacher editing tools remain private on your laptop while students see a pristine, lag-free 60fps mirror view!'
        },
        {
          id: 'note_shortcut_sheet',
          x: 600,
          y: 595,
          width: 560,
          height: 165,
          manualSize: true,
          bg: '#ffffff',
          color: '#1f2937',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>⌨️ Essential Keyboard Shortcuts:</b>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-top:8px;font-size:0.82rem;line-height:1.5;">' +
            '<div>• <b>Ctrl + J</b>: Connect link mode</div>' +
            '<div>• <b>Ctrl + Z / Y</b>: Undo / Redo</div>' +
            '<div>• <b>Space + Drag</b>: Pan canvas smoothly</div>' +
            '<div>• <b>Delete / Backspace</b>: Remove selected</div>' +
            '<div>• <b>Ctrl + C / V</b>: Copy &amp; Paste elements</div>' +
            '<div>• <b>Double-Click</b>: Edit node or note text</div>' +
            '<div>• <b>Scroll Wheel</b>: Zoom in / Zoom out</div>' +
            '<div>• <b>Ctrl + S</b>: Save board archive (.cstz)</div>' +
            '</div>'
        },

        // Zone 4: Audio Guide
        {
          id: 'note_audio_desc',
          x: 1220,
          y: 515,
          width: 340,
          height: 165,
          manualSize: true,
          bg: '#f0fdf4',
          color: '#14532d',
          borderColor: '#16a34a',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>🎧 Embedded Audio Features:</b>' +
            '<ul style="margin:6px 0 0 16px;padding:0;line-height:1.5;font-size:0.84rem;">' +
            '<li><b>Audio Nodes:</b> Attach sounds directly to vocabulary words for instant listening drills.</li>' +
            '<li><b>Speed Control:</b> Slow down playback to 0.75x or 0.5x for ESL/language learners.</li>' +
            '<li><b>Waveform Timeline:</b> Interactive scrubbing with current &amp; total time indicators.</li>' +
            '<li><b>Mic Recorder:</b> Record teacher pronunciation or student reading right on the board!</li>' +
            '</ul>'
        },

        // Zone 5: Video Guide
        {
          id: 'note_video_desc',
          x: 60,
          y: 1195,
          width: 440,
          height: 140,
          manualSize: true,
          bg: '#ffffff',
          color: '#1f2937',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>🎬 Multimedia Video Playback:</b><br>' +
            'Embed educational video clips directly on the canvas. Includes play/pause, timeline seeking, volume control, and fullscreen projection.<br><br>' +
            '<i>Tip: You can also drag and drop video files (.mp4, .webm) and multi-page PDF documents straight onto the board!</i>'
        },

        // Zone 6: Links Guide
        {
          id: 'note_links_guide',
          x: 660,
          y: 1145,
          width: 480,
          height: 140,
          manualSize: true,
          bg: '#ffffff',
          color: '#1f2937',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>🔗 Relationship Routing Styles:</b>' +
            '<div style="margin-top:6px;line-height:1.5;font-size:0.85rem;">' +
            '• <b>Straight &amp; Curved:</b> Smooth bezier paths with custom curvature.<br>' +
            '• <b>Orthogonal / Stepped:</b> Neat right-angle elbows for flowcharts.<br>' +
            '• <b>Animated Flowing Dash:</b> Dynamic marching ants indicating direction or energy flow.<br>' +
            '• <b>Text Labels:</b> Double-click any line to attach a descriptive relationship label!' +
            '</div>'
        },

        // Zone 7: Table Guide
        {
          id: 'note_table_guide',
          x: 1220,
          y: 1145,
          width: 510,
          height: 140,
          manualSize: true,
          bg: '#ffffff',
          color: '#1f2937',
          borderColor: '#333333',
          borderWidth: 2,
          borderStyle: 'solid',
          fontSize: 13,
          html:
            '<b>📊 Interactive Grid Tables:</b><br>' +
            'Tables allow matrix comparisons, vocabulary paradigms, grading rubrics, and seating summaries right on the canvas. You can format individual cells with custom colors, bold text, or even embed live concept nodes inside table cells!'
        }
      ],

      // --- MEDIA WIDGETS ---
      media: [
        {
          id: 'cm_audio_demo',
          kind: 'sounds',
          attachmentId: 'att_showcase_audio',
          name: 'welcome_chime.wav',
          mime: 'audio/wav',
          x: 1220,
          y: 435,
          w: 340,
          h: 56,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: '#333333'
        },
        {
          id: 'cm_video_demo',
          kind: 'videos',
          attachmentId: 'att_showcase_video',
          name: 'welcome_video.webm',
          mime: 'video/webm',
          x: 60,
          y: 990,
          w: 320,
          h: 180,
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: '#333333'
        }
      ],

      // --- TABLES ---
      tables: [
        {
          id: 'tbl_showcase',
          x: 1220,
          y: 930,
          rows: 4,
          cols: 4,
          colWidths: [120, 140, 140, 110],
          rowHeights: [36, 40, 40, 40],
          hasHeader: true,
          defaultBg: '#ffffff',
          defaultBorderColor: '#333333',
          defaultBorderWidth: 1.5,
          defaultFontSize: 13,
          cells: [
            // Header Row
            { type: 'text', text: 'Feature', bold: true, textAlign: 'left', bg: '#f3f4f6' },
            { type: 'text', text: 'Capabilities', bold: true, textAlign: 'left', bg: '#f3f4f6' },
            { type: 'text', text: 'Interactivity', bold: true, textAlign: 'left', bg: '#f3f4f6' },
            { type: 'text', text: 'Status', bold: true, textAlign: 'center', bg: '#f3f4f6' },

            // Row 1: Nodes
            { type: 'text', text: '🔲 Nodes', bold: true, textAlign: 'left' },
            { type: 'text', text: 'Visual concepts & math', textAlign: 'left' },
            { type: 'text', text: 'Drag / Resize / Formula', textAlign: 'left' },
            { type: 'text', text: '🟢 Live', bold: true, textAlign: 'center', bg: '#ecfdf5', color: '#047857' },

            // Row 2: Sticky Notes
            { type: 'text', text: '📝 Notes', bold: true, textAlign: 'left' },
            { type: 'text', text: 'Rich text & checklists', textAlign: 'left' },
            { type: 'text', text: 'HTML / Split / Colors', textAlign: 'left' },
            { type: 'text', text: '🟢 Live', bold: true, textAlign: 'center', bg: '#ecfdf5', color: '#047857' },

            // Row 3: Multimedia
            { type: 'text', text: '🎧 Media', bold: true, textAlign: 'left' },
            { type: 'text', text: 'Audio & video players', textAlign: 'left' },
            { type: 'text', text: 'Waveform / Fullscreen', textAlign: 'left' },
            { type: 'text', text: '🟢 Live', bold: true, textAlign: 'center', bg: '#ecfdf5', color: '#047857' }
          ]
        }
      ],

      // --- EDGES / LINKS ---
      edges: [
        {
          id: 'edge_welcome_widgets',
          a: 'node_hero_title',
          b: 'node_concept_photo',
          routing: 'curved',
          curvature: 0.22,
          thickness: 2,
          strokeColor: '#3b82f6',
          terminator: 'arrow',
          animated: true,
          label: 'concepts',
          labelBgActive: true,
          labelSize: 12
        },
        {
          id: 'edge_concept_katex',
          a: 'node_concept_photo',
          b: 'node_katex_formula',
          routing: 'straight',
          thickness: 2,
          strokeColor: '#059669',
          terminator: 'arrow',
          label: 'formula',
          labelBgActive: true,
          labelSize: 12
        },
        {
          id: 'edge_welcome_notes',
          a: 'node_hero_title',
          b: 'note_checklist',
          routing: 'curved',
          curvature: -0.18,
          thickness: 2,
          strokeColor: '#ca8a04',
          terminator: 'arrow',
          label: 'tasks',
          labelBgActive: true,
          labelSize: 12
        },
        {
          id: 'edge_welcome_audio',
          a: 'node_hero_title',
          b: 'node_audio_trigger',
          routing: 'curved',
          curvature: 0.25,
          thickness: 2,
          strokeColor: '#0284c7',
          terminator: 'arrow',
          label: 'listening',
          labelBgActive: true,
          labelSize: 12
        },
        {
          id: 'edge_link_demo_curved',
          a: 'node_link_source',
          b: 'node_link_curved',
          routing: 'curved',
          curvature: 0.35,
          thickness: 2.5,
          strokeColor: '#2563eb',
          terminator: 'arrow',
          animated: true,
          label: 'curved flow',
          labelBgActive: true,
          labelSize: 12
        },
        {
          id: 'edge_link_demo_stepped',
          a: 'node_link_source',
          b: 'node_link_stepped',
          routing: 'orthogonal',
          thickness: 2.5,
          strokeColor: '#7c3aed',
          terminator: 'arrow',
          label: 'step link',
          labelBgActive: true,
          labelSize: 12
        }
      ],

      // --- GROUPS ---
      groups: [
        {
          id: 'grp_widgets',
          title: '🔲 Nodes, Math & Interactive Widgets',
          paletteIdx: 2,
          nodeIds: [
            'node_concept_photo',
            'node_katex_formula',
            'node_timer_widget',
            'node_dice_widget',
            'node_masked_mystery'
          ],
          noteIds: ['note_widgets_guide', 'note_masked_hint'],
          x: 40,
          y: 320,
          manualW: 500,
          manualH: 520
        },
        {
          id: 'grp_notes',
          title: '📝 Sticky Notes & Rich Text Checklists',
          paletteIdx: 0,
          noteIds: ['note_checklist', 'note_callout_rules', 'note_shortcut_sheet'],
          nodeIds: [],
          x: 580,
          y: 320,
          manualW: 595,
          manualH: 520
        },
        {
          id: 'grp_audio',
          title: '🎧 Audio & Listening Lab',
          paletteIdx: 3,
          nodeIds: ['node_audio_trigger'],
          noteIds: ['note_audio_desc'],
          x: 1200,
          y: 320,
          manualW: 550,
          manualH: 520
        },
        {
          id: 'grp_video',
          title: '🎬 Video & Classroom Media Player',
          paletteIdx: 4,
          nodeIds: ['node_video_trigger'],
          noteIds: ['note_video_desc'],
          x: 40,
          y: 880,
          manualW: 500,
          manualH: 530
        },
        {
          id: 'grp_links',
          title: '🔗 Visual Links & Relationship Connectors',
          paletteIdx: 1,
          nodeIds: ['node_link_source', 'node_link_curved', 'node_link_stepped'],
          noteIds: ['note_links_guide'],
          x: 580,
          y: 880,
          manualW: 595,
          manualH: 530
        },
        {
          id: 'grp_tables',
          title: '📊 Structured Tables & Evaluation Grids',
          paletteIdx: 5,
          noteIds: ['note_table_guide'],
          nodeIds: [],
          x: 1200,
          y: 880,
          manualW: 550,
          manualH: 530
        }
      ],

      // --- SHAPES ---
      shapes: [
        {
          id: 'shp_arrow_down',
          type: 'arrow',
          lx1: 800,
          ly1: 275,
          lx2: 800,
          ly2: 315,
          color: '#e2c96e',
          thickness: 3.5
        }
      ]
    };
  }

  // --- 4. Showcase Controller & Loader ---
  const BoardWelcomeShowcase = {
    buildShowcaseData: buildShowcaseSessionData,

    /**
     * Loads the Showcase board into the current active canvas.
     * @param {boolean} [promptConfirm=false] - If true, ask user before overwriting existing content.
     */
    loadShowcaseBoard: async function (promptConfirm = false) {
      if (promptConfirm && typeof window.conSessionHasContent === 'function' && typeof window.conBuildSessionData === 'function') {
        const currentData = window.conBuildSessionData();
        if (window.conSessionHasContent(currentData)) {
          const msg = (window.i18n && i18n.t ? i18n.t('conShowcaseConfirmPrompt') : null)
            || 'Load the interactive Board Showcase? Any unsaved changes on the current canvas will be replaced.';
          const ok = typeof window.showConfirm === 'function' ? await window.showConfirm(msg) : confirm(msg);
          if (!ok) return false;
        }
      }

      const showcaseData = buildShowcaseSessionData();
      if (typeof window._conRestoreSession === 'function') {
        window._conRestoreSession(showcaseData);
      }

      // Update title bar
      const titleInput = document.getElementById('con-title-input');
      if (titleInput) {
        titleInput.value = showcaseData.title;
        if (typeof window.conSetTitle === 'function') window.conSetTitle(showcaseData.title);
      }

      // Ensure canvas height is expanded
      const brd = document.getElementById('constellation-board');
      if (brd) brd.style.height = showcaseData.boardHeight + 'px';

      // Keep dirty flag false on fresh load so user doesn't get prompted when closing immediately
      if (typeof window.boardSetDirty === 'function') {
        window.boardSetDirty(false);
      }

      if (typeof window.mdbToast === 'function') {
        const toastMsg = (window.i18n && i18n.t ? i18n.t('conShowcaseLoadedToast') : null)
          || '🌟 Welcome Showcase Board loaded successfully!';
        window.mdbToast(toastMsg);
      }

      return true;
    },

    /**
     * Checks if this is the very first time Board is opened, and auto-populates the showcase board.
     */
    checkAndAutoLoadOnFirstOpen: async function () {
      try {
        const STORAGE_KEY = 'cmt-board-showcase-initialized';
        const alreadyInitialized = localStorage.getItem(STORAGE_KEY);
        if (alreadyInitialized) return false;

        // Auto-populate on first launch
        await BoardWelcomeShowcase.loadShowcaseBoard(false);
        localStorage.setItem(STORAGE_KEY, '1');
        return true;
      } catch (err) {
        console.warn('[BoardShowcase] Auto-load check error:', err);
        return false;
      }
    }
  };

  // Expose to window
  global.BoardWelcomeShowcase = BoardWelcomeShowcase;
  global.conLoadWelcomeShowcaseBoard = BoardWelcomeShowcase.loadShowcaseBoard;
})(typeof window !== 'undefined' ? window : this);
