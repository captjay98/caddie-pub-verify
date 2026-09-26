# PRD: Caddie

### Problem Statement
Hackathon builders fail primarily from two traps: building outside fine print requirements (getting disqualified or ignored) and scope creep (failing to ship a working end-to-end loop in time).

### User Journey
1. **Contest Intake:** Builder enters contest URL. Caddie extracts verbatim eligibility, mandatory tech, and deadlines, then issues a fit verdict (`worth_it` / `stretch` / `skip`).
2. **Sharpen Idea:** Builder pitches concept. Caddie cuts secondary features until one demo-able loop remains, persisting the kernel.
3. **Plan First:** Caddie compiles structured `scope.md`, `prd.md`, and `spec.md`.
4. **Scaffold Repo:** Caddie creates a private GitHub repository and pushes the planning docs.
5. **Dry Run / Review:** Builder supplies build notes and demo link. Caddie evaluates work strictly against the hackathon rubric and names fatal failure modes.

### Key Screens & States
- **Card Lane:** Pinned state showing active contest, extracted claims, deadline countdown, and locked kernel.
- **Interview / Chat Lane:** Direct chief-of-staff interaction for sharpening, scoping, and planning.
- **Tasks Lane:** Scheduled rules re-check jobs and pending checklist items.
- **Scorecard Drawer:** Judge audit breakdown (Design, Impact, Innovation, Presentation) and risk checklist.