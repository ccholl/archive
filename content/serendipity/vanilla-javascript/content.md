
# From Simple Requirements to Complexity Hell


## Chapter 1: A Naive Beginning

The story begins with a simple idea.

I saw the website [How Generative Music Works](https://teropa.info/loop/): a huge canvas with all content on it. Press the spacebar and animations trigger (movement, zooming, text changes, etc.). The whole page feels like an explorable map.

Disliking traditional page navigation and the cookie-cutter blog format, I wanted to create a personal website with a unique interactive experience.

**Requirements:**
- Share articles with friends via URL
- Animate menu items when clicked, no page jumps—simulate the experience that all content exists on one large canvas through text movement (DOM manipulation) and layer state control (visible/invisible at specific times)

It seemed like just a menu interaction...
Or so it **seemed**.


## Chapter 2: First Illusion—"It's Just Animation"

First, I needed to implement the animation when clicking menu items.

When a user clicks a menu item, the text flies to the top-right corner, extends downward, rotates, and finally displays content. The whole process takes about 1.6 seconds, divided into 5 stages (as follows):

**Trigger scenario:** User clicks menu item


**Code path:**

```javascript
User clicks menu item
  ↓
document.addEventListener('click')  // Event delegation
  ↓
Identify clicked element type
  ↓
Extract itemData
  ↓
MenuItemAnimation.expandItem(container, labelElement, itemData)
  ↓
Execute 5-stage animation sequence
```



**Timeline:**

   0ms: Create clone element + container starts moving left
   ↓
 100ms: Clone element starts flying to top-right
   ↓ (0.5s transition)
 600ms: Arrives at top-right, starts extending downward
   ↓ (0.5s transition)
1100ms: Extension complete, rotate + background turns white + create Back button
   ↓ (0.5s transition)
1600ms: Rotation complete, load content
   ↓
Done: Final state

I wrote the code, tested it—perfect! Click menu item, animation plays, content displays. Really not hard, just CSS and JS working together. CSS handles styles, JS handles style switching. I originally named this project css-js-animation.

I thought the story ended here.

But when clicking the "Back" button, problems arose.

## Chapter 3: Going Back Is NOT Reversing!

I made a foolish mistake: if expanding is an animation, then going back is just playing the animation in reverse, right?

**Wrong.**

In the computer world, every element truly exists. When you create an animated element, it's there—occupying memory, occupying screen space. You think you're just "playing animation," but actually you're:

1. Creating new DOM elements (the flying text in the animation container)
2. Hiding original DOM elements (text in the menu)
3. Moving the entire menu container left off-screen
4. Creating a Back button
5. Loading content—the previously invisible content layer becomes visible

When going back, you need to:

1. Destroy the flying text—that cloned menu-item text you created for the animation effect
2. Delete the Back button—this interaction isn't needed in the main interface (z-index:10, z-index:22, z-index:20 visible)
3. Show the original text
4. Move the menu container back
5. Hide the content layer

**This isn't "playing animation in reverse," it's not some so-called inverse process—this is "cleaning up the battlefield."**

Animation isn't theater performance; animation is architecture. Every frame is real bricks and mortar. - BTW, I really wish there was software that could implement this just by declaratively describing the flow.

## Chapter 4: URL

Having solved the back button problem, I remembered another original requirement: sharing articles via URL.

This should be simple, right? When users click a menu item, just update the URL, like from `#/` to `#/AI is an installation/all in canvas`.

Initially, I wrote code in menuArchive.js:

```javascript
// When clicking menu item
window.location.hash = '#/AI is an installation/all in canvas';
```

Testing—perfect! URL updates, animation plays. (I still didn't know these two systems weren't fully decoupled)

**Then I refreshed the page.**

Everything disappeared. The URL remained, but both the content layer and the animated header on the right vanished. Instead, the text.container that should only appear on the main interface showed up.

### Why?

My content display was the **final step** of the animation. The whole flow was:

```
Click menu 
→ Play animation (1.6 seconds)
→ Animation ends 
→ Display content
```

When refreshing the page:
- URL is still there: `#/AI is an installation/all in canvas`
- But no one clicked the menu
- So animation didn't play
- So content didn't display

**The content layer's appearance is actually a byproduct of the animation!**

It's like building a house, but you can only see the house by walking a specific route. If you teleport directly to the destination, the house doesn't exist. - By the way, not turning this computer world logic into a game mechanic is such a waste.

#### Content as Animation Byproduct

#### Old Architecture

```javascript
// Error: Content display depends on animation execution
class MenuItemAnimation {
  expandItem(item) {
    // Stage 1: 0ms - Create animated element
    createAnimatedElement();

    // Stage 2: 100ms - Move to top-right
    setTimeout(() => moveToCorner(), 100);

    // Stage 3: 600ms - Extend downward
    setTimeout(() => extend(), 600);

    // Stage 4: 1100ms - Rotate
    setTimeout(() => rotate(), 1100);

    // Stage 5: 1600ms - Load content
    setTimeout(() => {
      showContent(item);  // ← Content displays here!
    }, 1600);
  }
}

// Problem scenario
window.location.hash = '#/media/photo';
// → Triggers hashchange
// → ArchiveMenu.showContent(itemData)
// → showContent() is an empty function!
// → Result: Nothing shows after refresh
```

**Root problem:** Content display is the final step of `expandItem()` animation flow. Without animation execution, there's no content.

## Chapter 5: A Series of Problems - CSS's Disappearing Act

Just as I prepared to solve the refresh problem, more bad things kept coming.

Test flow:
1. Click menu item → content displays ✓
2. Click Back → return to menu ✓
3. Refresh page → ...finally solved the problem of header and content layer persisting, but clicking back, the previous animation doesn't work??

My "container movement" relied on adding CSS classes:

- Add `.menu-slide-left` class → menu slides off-screen
- Remove `.menu-slide-left` class → menu slides back

But! **Refreshing the page clears all JavaScript-added CSS classes.**

So:
- After clicking menu: container off-screen (has CSS class)
- Refresh page: container returns to center (CSS class disappears)
- Click Back: try to remove a non-existent class → nothing happens

Like a magician's hat. During the performance, you can put the rabbit in and take it out. But if you change hats midway, the original rabbit can't be found. - Similarly, not turning this phenomenon into a game mechanic is such a waste.

## Chapter 6: New Understanding - These Are Three Interactions, Not One

**Back to my original conception: I only had one interaction—click menu item, everything else would just work out.**

But there are actually three completely different interactions:

### Interaction 1: Click Menu (Animation Mode)
- User clicks on page
- Needs beautiful animation
- Needs visual feedback
- Takes 1.6 seconds

### Interaction 2: Refresh Page (Direct Mode)
- User refreshes or shares URL
- Doesn't need animation
- Needs immediate content display
- Takes 50 milliseconds

### Interaction 3: Click Back (Cleanup Mode)
- User wants to return to menu
- Needs reverse animation
- Needs to clean up all created elements
- Needs to restore initial state

These three interactions look similar but have different underlying logic. Like:

- Watching a movie (animation mode)
- Reading spoilers (direct mode)  
- Rewinding (cleanup mode)

## Chapter 7: Solution—Separating State and Animation

Actually, with errors continuously appearing, I was already numb. But having come this far, might as well continue. (Humans fear sunk costs)

So how to solve it?

I remembered my core requirement beyond animation—I wanted to share content with friends, I wanted to link between different articles...: **URL shouldn't be the result of animation; URL should be the source of state.** - By the way, this is somewhat like hypertext thinking.

### Old Thinking

```
Click menu 
→ Play animation 
→ Display content 
→ Update URL
```

URL is the result. After refresh, URL remains, but the process that generated it (animation) disappeared, so content disappeared too.

### New Thinking

```
URL: #/AI is an installation/all in canvas
     ↓
Determine: How did the user arrive?
     ↓
├─ Click menu → Animation mode → Display content after 1.6s
└─ Refresh page → Direct mode → Display content immediately
```

URL is the source. No matter how users reach this URL, the final state should be the same.

This is like GPS navigation:
- Drive there (animation mode): See scenery along the way, arrive slowly
- Teleport there (direct mode): Appear directly at destination

Either way, you end up at the same place.

### Specific Implementation: Dual System

I designed two completely independent systems:

Overview:

**System A: Animated Expansion** - For clicks
- Get original position of menu item
- Create clone element
- Play animation in 5 stages
- Finally load content

**System B: Direct Rendering** - For refresh
- Skip all animation
- Directly create final-state elements
- Load content immediately

Final state is completely identical:
- Header on the right
- Content in the middle
- Back button in top-right
- Menu container off-screen

But arrival method differs: one is a journey, one is teleportation.

#### URL-Driven Principle

```javascript
// URL is the single source of truth
URL: #/AI is an installation/all in canvas → State: { category: 'AI is an installation', item: 'all in canvas' }
URL: #/          → State: { showMenu: true }

// State must be fully recoverable from URL
function restoreState(url) {
  const state = parseURL(url);
  renderState(state);  // Doesn't depend on animation history
}
```

#### Separation Principle

```javascript
// State rendering (required)
function renderState(state) {
  // Only care about final result, not how we got there
  showHeader(state.item);
  showContent(state.item);
}

// Animation effect
function animateTransition(fromState, toState) {
  // Visual transition, doesn't affect final state
  playAnimation();
}
```

#### Idempotency Principle

```javascript
// Multiple calls should produce same result
renderState(state);
renderState(state);  // Second call should have no side effects

// Independent of call order
renderState(stateA);
renderState(stateB);
// Final state only depends on stateB, unaffected by stateA
```

---

#### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  User Action                         │
└──────────┬─────────────────────┬────────────────────┘
           │                     │
           ↓                     ↓
    ┌──────────┐         ┌──────────────┐
    │Click Menu│         │Refresh/ShareURL│
    └──────────┘         └──────────────┘
           │                     │
           ↓                     ↓
    ┌──────────┐         ┌──────────────────┐
    │Animation │         │  Direct Mode     │
    │   Mode   │         │animated: false   │
    └──────────┘         └──────────────────┘
           │                     │
           ↓                     ↓
    ┌──────────────┐     ┌────────────────────┐
    │ expandItem() │     │ renderContentState()│
    └──────────────┘     └────────────────────┘
           │                     │
           ├─────────────────────┤
           │                     │
           ↓                     ↓
    ┌───────────────────────────────┐
    │  Final State (Identical)      │
    │  - Header on right            │
    │  - Content in middle          │
    │  - Back button top-right      │
    │  - Container off-screen       │
    └───────────────────────────────┘
```

Through this process, I also realized:
Perhaps determining how state changes first, then deciding animation interactions is a better approach.
Animation as a transition method between two states, rather than content layer presentation being a byproduct of animation.

## Chapter 8: Reflection

### 1. Interaction Polymorphism

"Click menu item" isn't one interaction, but three:

```
User path A: Click → needs animation + visual feedback
User path B: Refresh → needs immediate rendering + state restoration
User path C: Back → needs reverse animation + cleanup side effects
```

**Lesson:** Before coding, enumerate all possible user paths. Same destination, different paths require different implementations.

### 2. Animation as State Machine

Animation isn't "casting magic on elements," but:

```
Create DOM → Modify properties → Trigger reflow → Browser renders → Delete DOM
```

Every stage has side effects that need cleanup. **Ignoring any step = memory leak or visual bug**.

Declarative frameworks (React/Vue) are popular because they manage these side effects for you.

### 3. State-Driven vs Event-Driven

This is the most critical architectural shift:

| Mental Model | Question | Focus | Predictability |
|--------------|----------|-------|----------------|
| Event-driven | "What did user click?" | Action sequence | Low (depends on history) |
| State-driven | "What should display now?" | Current state | High (idempotent) |

**Why is state-driven stronger?** Because `f(state) = UI` is a pure function, while `UI = Σ(events)` depends on event order.

This is also the core idea of state management libraries like Redux and Zustand.

### 4. Browser's Asynchronous Nature

The browser isn't a command executor; it's an **optimization engine**:

- It batches DOM operations
- It defers reflow to next frame
- It merges multiple style changes

**What I thought:**
```javascript
element.style.left = '0px';    // Takes effect immediately
element.style.left = '100px';  // Takes effect immediately
```

**What actually happens:**
```javascript
element.style.left = '0px';    // Added to pending queue
element.style.left = '100px';  // Overwrites previous
// Next frame: Browser only renders 100px
```

To control animation, you must understand and **actively interrupt** browser optimization (`offsetHeight`, `requestAnimationFrame`).

### 5. Multiplication Law of Complexity

"Animation + URL" sounds simple, but:

```
Animation system: 5 stages × 2 modes (with/without)
URL system: 3 trigger methods (click/refresh/share)
DOM state: 2 types (elements exist/don't exist)
CSS state: 2 types (classes exist/don't exist)

Theoretical complexity: 5 × 2 × 3 × 2 × 2 = 120 scenarios
```

Complexity isn't addition (5+3+2+2=12), it's multiplication (5×3×2×2=120). This is why "simple features" explode.

---

## Epilogue

### Engineering Reflection

This project is an **anti-pattern case**:

- Intent: Showcase Vanilla JS elegance and lightweight nature
- Reality: Hand-written state management + hand-written animation orchestration = complexity out of control
- Lesson: **Don't reinvent the wheel**—frameworks exist for a reason

If redoing it, I'd use:
- Svelte/React/Vue to manage state and DOM
- Framer Motion/GSAP to manage animation
- React Router/Vue Router to manage routing
...
But I don't want to work on this anymore.

### Mathematical Insights

From a learning perspective, this is an excellent **complex system sample**:

- How does combinatorial explosion occur?
- How to untangle cyclic dependencies?
- What's the mathematical principle of dimensional reduction?

I wrote a complexity analysis from mathematical prespective. **That one is much more interesting than this.**

→ **[Read Mathematical Analysis: Why "Simple Animation + Simple URL" = Complex System](link)**

---