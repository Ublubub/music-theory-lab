# Git & GitHub: a beginner's guide for this project

You don't need to memorise any of this, since Claude handles the Git side. It's here so you know what's happening
and can do it yourself whenever you want.

## The five words you need

| Word | Meaning |
|---|---|
| **Repository (repo)** | The project folder plus its full history. Lives on your computer *and* on GitHub. |
| **Commit** | A saved snapshot of the project with a message ("Add chord builder"). You can always go back to one. |
| **Push** | Upload your new commits to GitHub. |
| **Pull** | Download commits from GitHub that you don't have yet (e.g. if you edited on the website). |
| **Branch** | A parallel line of work. `main` is the real version; new features can be built on a side branch and merged in when ready. |

## Where things are

- **On your computer:** the project folder (the one containing `index.html`).
- **On GitHub:** `https://github.com/Ublubub/music-theory-lab`

## Everyday commands

Run these in a terminal *inside the project folder*:

```bash
git status                 # what changed since the last commit?
git add -A                 # stage all changes for the next commit
git commit -m "Describe what you changed"
git push                   # upload to GitHub
git pull                   # download changes from GitHub
git log --oneline          # list past commits
```

The typical loop: **edit → `git add -A` → `git commit -m "…"` → `git push`.**

## Working with Claude on this repo

- Ask for a change ("add secondary dominants"). Claude edits the files, runs the tests, commits with a clear
  message, and pushes when you ask.
- Bigger features can go on a **branch** with a **pull request (PR)**: a page on GitHub showing exactly what
  changed, which you can review before it's merged into `main`.
- Every push runs the automated tests on GitHub (the **Actions** tab). A green ✓ means the tests passed.

## Putting the app online for free (GitHub Pages)

GitHub can host the app as a website at `https://ublubub.github.io/music-theory-lab/`.

- On a free GitHub account, Pages requires the repo to be **public**.
- Settings → Pages → *Deploy from a branch* → `main` / `/ (root)` → Save. The site appears a minute later.
- Or ask Claude to do it.

## If something goes wrong

| Message | What it means / what to do |
|---|---|
| `rejected … fetch first` | GitHub has commits you don't. Run `git pull`, then `git push` again. |
| `nothing to commit` | No changes since the last commit. Nothing is wrong. |
| `CONFLICT` | You and GitHub both changed the same lines. Ask Claude to resolve it. |
| Anything scary | Don't delete the folder. Ask Claude: the history means nothing committed is ever lost. |
