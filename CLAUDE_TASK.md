# Task: Admin Dashboard — Content Management Sections

## Context
The admin dashboard (view==="admin") needs two new content sections added below the existing user/leaderboard area. These replace the old "Blog" sidebar button which opened an iframe to admin/blog.

## Section 1: RKRT Marketing
Shows content from the `rkrt_content` table (brand marketing for RKRT.in itself).

### UI Requirements:
- Section header: "RKRT Marketing" with subtitle "Brand content for RKRT social channels and blog"
- Two sub-tabs: "Social Posts" and "Blog Posts"
- Social Posts tab: Grid of cards showing rkrt_content where content_type='social'. Each card shows image thumbnail (or placeholder), title, platform badge (FB/IG/LinkedIn), post preview text, copy button, status badge. Sort by created_at DESC.
- Blog Posts tab: List of rkrt_content where content_type='blog'. Each row shows image thumbnail, title, excerpt, published date, View link to rkrt.in/blog/{slug}.
- "Generate Content" button that calls: fetch('https://usknntguurefeyzusbdh.supabase.co/functions/v1/generate-rkrt-content', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({images:true, type:'both', force:true})})
- Loading state while generating

### Data fetching:
const {data} = await supabase.from('rkrt_content').select('*').order('created_at', {ascending: false}).limit(50);

## Section 2: Brokerage Blogs
Shows content from the `brokerage_posts` table (per-brokerage recruiting content).

### UI Requirements:
- Section header: "Brokerage Blogs" with subtitle "AI-generated recruiting content for affiliated brokerages"
- Stats row: Total posts, Approved, Pending, by brokerage breakdown
- Filter by brokerage (dropdown)
- Post list: title, brokerage name, status badge (draft/approved/published), date, approve/reject buttons for drafts
- Approve button: updates status to 'approved', sets approved_by to authUser.id and approved_at to new Date().toISOString()
- "Generate New" button per brokerage

### Data fetching:
const {data} = await supabase.from('brokerage_posts').select('*, brokerages(name, slug)').order('created_at', {ascending: false}).limit(50);

## Where to add:
In src/App.jsx, inside the admin view render block (view==="admin"). Add these sections AFTER the existing admin stats/users/leaderboard sections (around line 950).

## Styling:
- Match existing admin dashboard dark theme (T color tokens from src/lib/theme.js)
- Cards: background T.card, border 1px solid T.b, borderRadius 12
- Status badges: draft=yellow, approved=green, published=blue, rejected=red
- Platform badges: facebook=blue, instagram=purple, linkedin=blue, x=gray

## Also:
- Remove the "Blog" sidebar button (the one that opens admin/blog iframe) — this section replaces it
- The supabase client and authUser are available in scope
- Use CopyButton component for copy actions (already imported)

## DO NOT:
- Modify any other views or components
- Change the existing admin stats/users section  
- Create new files — add everything inline in App.jsx admin section
