# FinArt Clone - Design Guidelines

## Design Approach
**System-Based Approach**: Material Design principles adapted for mobile-first finance application. Reference inspiration from FinArt's Android app aesthetic with focus on clarity, trust, and efficiency in financial data management.

## Core Design Principles
1. **Mobile-First Clarity**: Every element optimized for single-thumb operation on Android devices
2. **Data Hierarchy**: Financial information presented with clear visual priority (amounts > categories > dates)
3. **Trust Through Simplicity**: Clean, uncluttered interface builds confidence in money management
4. **Immediate Feedback**: Every action provides clear visual confirmation

---

## Typography System

**Primary Font**: Inter (via Google Fonts CDN)
**Secondary Font**: Roboto (fallback for system consistency)

**Hierarchy**:
- Page Titles: 24px/28px, Semi-bold (600)
- Section Headers: 20px/24px, Semi-bold (600)
- Card Titles: 16px/20px, Medium (500)
- Body Text: 14px/20px, Regular (400)
- Amounts (large): 32px/36px, Bold (700) - for dashboard totals
- Amounts (list): 18px/22px, Semi-bold (600) - for transaction items
- Labels/Captions: 12px/16px, Medium (500)
- Button Text: 14px/16px, Medium (500)

**Number Formatting**: All rupee amounts display as "₹X,XXX" with Indian numbering system (lakhs/crores)

---

## Layout System

**Spacing Scale**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 (mobile), p-6 (tablet+)
- Section spacing: space-y-6 (mobile), space-y-8 (tablet+)
- Card gaps: gap-4
- List item padding: p-4
- Button padding: px-6 py-3

**Mobile Breakpoints**:
- Base: 320px+ (primary focus)
- sm: 640px (large phones)
- md: 768px (tablets)
- lg: 1024px+ (desktop bonus view)

**Container Strategy**:
- App shell: Full viewport width with max-w-2xl centered for tablet+
- Dashboard cards: Full width mobile, 2-col grid on md+
- Transaction lists: Single column always
- Forms: max-w-lg centered

---

## Navigation Structure

**Bottom Navigation Bar** (Fixed, Android-style):
- 4 primary tabs: Dashboard, Transactions, Budgets, More
- Icon + label (active state shows filled icon)
- Height: 64px with safe-area-inset-bottom for modern Android
- Elevation shadow above content

**Top App Bar**:
- Height: 56px
- Contains page title, action buttons (add, filter, search)
- Sticky positioning on scroll
- Elevation shadow when scrolled

---

## Component Library

### Dashboard Cards
- Rounded corners: rounded-xl
- Padding: p-6
- Shadow: subtle elevation (shadow-md)
- Contains: Title, large amount, trend indicator, mini chart/progress bar

### Transaction List Items
- Full-width tap targets (min-height: 72px)
- Left: Category icon in colored circle (48px)
- Center: Category name, note/description (secondary text)
- Right: Amount (bold), date (caption below)
- Divider lines between items

### Expense Entry FAB (Floating Action Button)
- Position: fixed bottom-right (with 80px bottom offset for nav bar)
- Size: 56px circle
- Plus icon, prominent elevation
- Primary action trigger

### Category Badges
- Pill-shaped with icon + label
- Padding: px-3 py-1.5
- Each category has distinct icon (use Material Icons via CDN)

### Budget Progress Indicators
- Horizontal bar with fill percentage
- Shows spent/total with visual warning states (green < 80%, yellow 80-100%, red > 100%)
- Label above, amount/percentage below

### Charts & Graphs
- Use Chart.js (via CDN) for pie charts (spending by category) and line graphs (spending trends)
- Responsive, touch-friendly with legend below
- Height: 250px mobile, 300px tablet+

### Forms
- Full-width input fields with floating labels
- Input height: 56px
- Border-radius: rounded-lg
- Focus states with clear visual feedback
- Amount input: Large, prominent with ₹ prefix
- Category selector: Chip/button grid layout
- Date picker: Native Android date input
- Notes: Expandable textarea

### Buttons
- Primary: Full-width on mobile, auto-width on tablet+
- Height: 48px
- Border-radius: rounded-lg
- Text: 14px medium weight

### Empty States
- Centered icon (96px), title, description, CTA button
- Friendly messaging for no transactions/budgets

---

## Images

**No large hero images** - This is a utility app focused on data and functionality.

**Icon Usage**:
- Category icons: Material Icons (grocery, transport, dining, bills, entertainment, shopping, health, etc.)
- Navigation icons: Material Icons filled/outlined variants
- All via CDN, no custom SVG generation

**Receipt Attachments**:
- Thumbnail previews in transaction items (48px square, rounded)
- Tap to expand full-screen view

---

## Animations

**Minimal, Purposeful Only**:
- Page transitions: Slide left/right (200ms ease-out)
- Bottom sheet modals: Slide up from bottom (250ms)
- List item actions: Swipe-to-delete reveal (150ms)
- Form validation: Shake animation on error (300ms)
- Chart rendering: Subtle fade-in (400ms)

**No decorative animations** - prioritize performance and clarity.

---

## Accessibility

- Minimum tap targets: 48px × 48px
- Color contrast: WCAG AA compliant for all text
- Form labels: Always visible (no placeholder-only)
- Error messages: Clear, positioned below input fields
- Screen reader: Semantic HTML, proper ARIA labels for icons/actions

---

## Mobile-Specific Patterns

**Pull-to-Refresh**: On transaction list and dashboard
**Swipe Actions**: Left swipe reveals delete on transaction items
**Bottom Sheets**: For filters, category selection, quick actions
**Keyboard Avoidance**: Forms scroll/adjust when keyboard appears
**Safe Areas**: Respect Android notch/gesture areas
**Haptic Feedback**: Subtle vibration on important actions (add expense, delete)

---

## App Shell Structure

**Three-Layer Architecture**:
1. Top app bar (56px, sticky)
2. Scrollable content area (fills remaining height)
3. Bottom navigation (64px, fixed)

**Full viewport usage** with proper safe-area handling for modern Android devices.