# Layout Guide - Visual Reference

## Desktop Layout (> 1024px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 🎓 AI Exam Tutor        [Grades ▾]          👤 user@example.com ▾           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
┌─────────────┬──────────────────────────────────────────────┬─────────────────┐
│             │                                              │                 │
│ Chat        │                                              │   AI Tutor      │
│ History     │         📄 Exam Paper PDF Viewer            │   Chat          │
│             │                                              │                 │
│ Mathematics │                                              │ ┌─────────────┐ │
│ • 2024 P1   │                                              │ │You: Q1?     │ │
│ • 2023 P1   │                                              │ └─────────────┘ │
│             │                                              │                 │
│ Physics     │                                              │ ┌─────────────┐ │
│ • 2024 P1   │                                              │ │AI: Here's...│ │
│             │                                              │ └─────────────┘ │
│             │                                              │                 │
│ 256px       │            Flexible (grows)                  │ ┌─────────────┐ │
│             │                                              │ │Ask...    [>]│ │
│             │                                              │ └─────────────┘ │
│             │                                              │     500px       │
└─────────────┴──────────────────────────────────────────────┴─────────────────┘
```

## Mobile Layout (< 768px)

### Paper View
```
┌────────────────────────────────────────┐
│ ☰  Math - Grade 12   [📄] [💬]        │
│    2024 Paper 1                        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│                                        │
│                                        │
│                                        │
│     📄 Exam Paper PDF Viewer          │
│        (Full Screen)                   │
│                                        │
│                                        │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

### Chat View (Toggle to 💬)
```
┌────────────────────────────────────────┐
│ ☰  Math - Grade 12   [📄] [💬]        │
│    2024 Paper 1                        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ AI Tutor Chat (Full Screen)           │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ You: Explain question 1?           │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ AI: Question 1 asks...             │ │
│ │                                    │ │
│ │ ## Explanation                     │ │
│ │ ...                                │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Ask about a question...        [>] │ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### Mobile Menu (☰ Clicked)
```
┌────────────────────────────────────────┐
│ ← Dashboard                        [×] │
├────────────────────────────────────────┤
│ CHAT HISTORY                           │
│                                        │
│ Mathematics                            │
│  • 2024 - Paper 1 (Grade 12)          │
│  • 2023 - Paper 1 (Grade 12)          │
│                                        │
│ Physics                                │
│  • 2024 - Paper 1 (Grade 12)          │
│                                        │
├────────────────────────────────────────┤
│ ⚙️ Profile Settings                    │
│ 🚪 Logout                              │
└────────────────────────────────────────┘
```

## Navigation - Grades Dropdown (Desktop)

```
┌──────────────────────────────────────────┐
│ 🎓 AI Exam Tutor   [Grades ▾]          │
└──────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────────┐
        │ GRADE 1                        │
        │  Mathematics                   │
        │   • 2024 - Paper 1             │
        │  English                       │
        │   • 2024 - Paper 1             │
        │                                │
        │ GRADE 3                        │
        │  Mathematics                   │
        │   • 2024 - Paper 1             │
        │   • 2023 - Paper 1             │
        │                                │
        │ GRADE 12                       │
        │  Mathematics                   │
        │   • 2024 - Paper 1             │
        │   • 2024 - Paper 2             │
        │  Physics                       │
        │   • 2024 - Paper 1             │
        │                                │
        │ GRADE AS                       │
        │  Mathematics                   │
        │   • 2024 - Paper 1             │
        └────────────────────────────────┘
```

## Navigation - Mobile Grades Menu

```
┌────────────────────────────────────────┐
│ ☰ AI Exam Tutor                    [×] │
├────────────────────────────────────────┤
│ GRADES                                 │
│                                        │
│ Grade 1                                │
│  Mathematics                           │
│   • 2024 - Paper 1                     │
│  English                               │
│   • 2024 - Paper 1                     │
│                                        │
│ Grade 3                                │
│  Mathematics                           │
│   • 2024 - Paper 1                     │
│   • 2023 - Paper 1                     │
│                                        │
│ Grade 12                               │
│  Mathematics                           │
│   • 2024 - Paper 1                     │
│   • 2024 - Paper 2                     │
│  Physics                               │
│   • 2024 - Paper 1                     │
│                                        │
├────────────────────────────────────────┤
│ ⚙️ Profile Settings                    │
│ 🚪 Logout                              │
└────────────────────────────────────────┘
```

## Color Scheme

### Primary Colors
```
Emerald Green
┌─────────┐
│ #10b981 │ emerald-600 (Primary actions, active states)
└─────────┘
┌─────────┐
│ #059669 │ emerald-700 (Hover states)
└─────────┘
┌─────────┐
│ #ecfdf5 │ emerald-50 (Subtle backgrounds, hover)
└─────────┘
```

### Neutral Colors
```
Grays
┌─────────┐
│ #111827 │ gray-900 (Primary text)
└─────────┘
┌─────────┐
│ #374151 │ gray-700 (Secondary text)
└─────────┘
┌─────────┐
│ #4b5563 │ gray-600 (Tertiary text)
└─────────┘
┌─────────┐
│ #9ca3af │ gray-400 (Disabled text)
└─────────┘
┌─────────┐
│ #e5e7eb │ gray-200 (Borders)
└─────────┘
┌─────────┐
│ #f3f4f6 │ gray-100 (Light backgrounds)
└─────────┘
┌─────────┐
│ #f9fafb │ gray-50 (Page backgrounds)
└─────────┘
┌─────────┐
│ #ffffff │ white (Panels, cards)
└─────────┘
```

## Border Radius Guide

```
Small Elements (buttons, tags)
┌─────────┐
│ 0.5rem  │ rounded-lg (8px)
└─────────┘

Medium Elements (cards, panels)
┌─────────┐
│ 0.75rem │ rounded-xl (12px)
└─────────┘

Large Elements (modals, dropdowns)
┌─────────┐
│ 1rem    │ rounded-2xl (16px)
└─────────┘
```

## Spacing System

```
Gap-2  = 0.5rem  (8px)   - Between related items
Gap-3  = 0.75rem (12px)  - Between elements
Gap-4  = 1rem    (16px)  - Between sections
Gap-6  = 1.5rem  (24px)  - Between major sections
Gap-8  = 2rem    (32px)  - Between page sections

Padding-2 = 0.5rem  (8px)   - Tight padding
Padding-3 = 0.75rem (12px)  - Comfortable padding
Padding-4 = 1rem    (16px)  - Standard padding
Padding-6 = 1.5rem  (24px)  - Generous padding
Padding-8 = 2rem    (32px)  - Large padding
```

## Typography Scale

```
Headings
┌──────────────────┐
│ 2xl - 24px/1.5   │ Page titles
│ xl  - 20px/1.5   │ Section titles
│ lg  - 18px/1.75  │ Card titles
│ base - 16px/1.5  │ Body text
│ sm  - 14px/1.25  │ Secondary text
│ xs  - 12px/1.25  │ Small text, labels
└──────────────────┘

Weights
┌──────────────────┐
│ semibold (600)   │ Headings
│ medium (500)     │ Emphasized text
│ normal (400)     │ Body text
└──────────────────┘

Special
┌──────────────────┐
│ font-mono        │ Code, math expressions
│ leading-relaxed  │ Better readability
└──────────────────┘
```

## Interactive States

### Buttons
```
Default:  bg-emerald-600 text-white
Hover:    bg-emerald-700
Disabled: opacity-50 cursor-not-allowed
Focus:    ring-2 ring-emerald-500
```

### Links / Menu Items
```
Default:  text-gray-700
Hover:    text-gray-900 bg-gray-50
Active:   text-emerald-700 bg-emerald-50 font-medium
```

### Input Fields
```
Default:  border-gray-300
Focus:    ring-2 ring-emerald-500 border-transparent
Error:    border-red-500 ring-2 ring-red-500
```

## Breakpoint Reference

```
Mobile First Approach:

< 640px   (sm)  - Mobile phones
< 768px   (md)  - Large phones
< 1024px  (lg)  - Tablets
< 1280px  (xl)  - Small laptops
< 1536px  (2xl) - Large laptops
> 1536px        - Desktops

Our main breakpoint: lg (1024px)
- Below lg: Mobile layout (single column, toggles)
- Above lg: Desktop layout (3 columns, all visible)
```

## Icon Usage

```
Navigation:  h-5 w-5 (20px) or h-6 w-6 (24px)
Buttons:     h-4 w-4 (16px) or h-5 w-5 (20px)
Status:      h-4 w-4 (16px)
Large:       h-8 w-8 (32px) or h-12 w-12 (48px)
```

## Z-Index Layers

```
z-50  - Modals, dropdowns (highest)
z-40  - Overlays
z-30  - Sticky elements
z-20  - Floating elements
z-10  - Raised elements
z-0   - Base layer (default)
```

## Animation Guidelines

```
Transitions: transition-colors (150ms)
Hover states: Instant feedback
Dropdown open: 0.2s ease
Mobile menu: 0.3s slide-in
Loading: Continuous spin (animate-spin)
```

## Accessibility Minimum Sizes

```
Touch Targets: 44px × 44px minimum
Text Size: 14px minimum (preferably 16px)
Color Contrast: WCAG AA compliant
  - Normal text: 4.5:1
  - Large text: 3:1
```

This layout guide provides a visual reference for the complete UI redesign!
