<!-- 4c05dc77-2ff2-4bc2-a4ee-78adc0c512c1 5a754b82-b591-463b-a91c-c60f0b2df67f -->
# Add Optional Comprehension Questions to Policy Acknowledgment

### Goals

- Admin can toggle “Require questions” and add 1–5 MCQs (2+ options, one correct).
- Recipient flow: view all pages → answer all correctly → signature enabled → submit.
- Server validates answers (all must be correct) before recording acknowledgment.

### Data Model & Migration

- Add to `backend/app/models/models.py`:
- `Policy.questions_enabled: bool = False`
- New table `policy_questions` with fields:
- `id (UUID PK)`, `policy_id (FK)`, `order_index (int)`, `prompt (text)`, `choices (json)`, `correct_index (int)`, `created_at (datetime)`
- Create Alembic migration to add column and create `policy_questions`.

### Backend APIs

- Update `backend/app/schemas/policies.py`:
- Extend `PolicyResponse` to include `questions_enabled` and (for admin views) `questions: PolicyQuestion[]`.
- Add `PolicyQuestion` (admin) and `PolicyQuestionPublic` (for recipients, without `correct_index`).
- Update `backend/app/api/policies.py`:
- `POST /policies` and `PUT /policies/{id}` accept:
- `questions_enabled: bool = Form(False)`
- `questions_json: str | None = Form(None)` (JSON array of questions: `{prompt, choices[], correct_index, order_index}`)
- Validate constraints: 1–5 questions, each 2–6 choices, exactly one `correct_index` within range. Only allow edits when no acknowledgments exist (already enforced for policy updates).
- Update `backend/app/schemas/acknowledgments.py` and `backend/app/api/acknowledgments.py`:
- Extend `AckPageData` to include `questions: PolicyQuestionPublic[]` when `questions_enabled` is true.
- Extend `AcknowledgmentCreate` to accept `answers: [{question_id: UUID, selected_index: int}]`.
- In `POST /ack/{token}`: if `policy.questions_enabled` is true, require `answers` present, count must match active questions, and all `selected_index` must equal stored `correct_index`. On any mismatch, return 400 with a helpful message.
- Keep typed signature rules as-is.

### Frontend (Admin)

- Update `frontend/src/components/PolicyForm.jsx`:
- Add a toggle “Require comprehension questions” (default off). When on, render a Question Builder UI:
- Add up to 5 questions; each with prompt, 2–6 options, and a radio to mark the correct option.
- Enforce limits client-side; show counts and validation messages.
- Maintain dark/light theme using existing Tailwind classes (e.g., `dark:bg-slate-800`, `dark:text-slate-100`).
- On submit, add to `FormData`:
- `questions_enabled` (boolean)
- `questions_json` (JSON.stringify of the array)

### Frontend (Recipient)

- Update `frontend/src/pages/AcknowledgePage.jsx`:
- Pass `ackPageData.questions` into the form.
- Update `frontend/src/components/AcknowledgeForm.jsx`:
- Render questions (if present) above signature section.
- Require all questions to be answered before enabling signature inputs and submit button.
- Submit payload includes `answers` with `{question_id, selected_index}`; rely on server to validate correctness (show error toast if any are wrong).
- Keep existing PDF page gating via `PolicyViewer` + `PDFModal` and only enable the final submit when both conditions hold: document viewed + all questions answered.

### API Client

- Update `frontend/src/api/client.js` `ackAPI.submit` to include `answers` in the request body when present.

### Security & UX Notes

- Do not send `correct_index` to recipients; only send `prompt`, `choices`, and `question_id`.
- Server is the source of truth for correctness.
- Error responses for wrong answers: return which items were incorrect (by index) without revealing correct answers.

### Rollout

- Backward compatible: policies without questions work unchanged.
- Analytics/logs: optionally log question usage rate for future insights.

### To-dos

- [ ] Add Policy.questions_enabled and create policy_questions table
- [ ] Add models and Pydantic schemas for questions
- [ ] Extend create/update policy endpoints to accept questions_json
- [ ] Include questions in AckPageData without correct_index
- [ ] Validate answers in POST /ack/{token} (all must be correct)
- [ ] Add toggle and question builder in PolicyForm.jsx
- [ ] Render questions in AcknowledgeForm and gate signature
- [ ] Update ackAPI.submit to send answers array
- [ ] QA happy path, errors, limits, toggling on/off