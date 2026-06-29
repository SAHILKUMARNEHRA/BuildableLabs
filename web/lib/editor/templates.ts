/**
 * Document templates — like Microsoft Word's "New from template".
 *
 * Each template has a starting title and HTML content. When you create a
 * document from a template, the creator's editor seeds this HTML into the
 * shared Yjs document once (only if it is still empty), so everyone then
 * collaborates on top of it.
 */
export interface DocTemplate {
  key: string;
  name: string;
  description: string;
  icon: string;
  title: string;
  html: string;
}

export const TEMPLATES: DocTemplate[] = [
  {
    key: 'blank',
    name: 'Blank document',
    description: 'Start from scratch.',
    icon: '📄',
    title: 'Untitled document',
    html: '',
  },
  {
    key: 'letter',
    name: 'Letter',
    description: 'A formal letter layout.',
    icon: '✉️',
    title: 'Letter',
    html: `
      <p>[Your Name]</p>
      <p>[Your Address]</p>
      <p>[Date]</p>
      <p></p>
      <p>Dear [Recipient],</p>
      <p>I am writing to you regarding…</p>
      <p></p>
      <p>Thank you for your time and consideration.</p>
      <p></p>
      <p>Sincerely,</p>
      <p>[Your Name]</p>
    `,
  },
  {
    key: 'meeting',
    name: 'Meeting notes',
    description: 'Agenda, notes and action items.',
    icon: '📝',
    title: 'Meeting notes',
    html: `
      <h1>Meeting notes</h1>
      <p><strong>Date:</strong> &nbsp; <strong>Attendees:</strong></p>
      <h2>Agenda</h2>
      <ul><li>Topic 1</li><li>Topic 2</li></ul>
      <h2>Discussion</h2>
      <p>…</p>
      <h2>Action items</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Owner — task…</li>
        <li data-type="taskItem" data-checked="false">Owner — task…</li>
      </ul>
    `,
  },
  {
    key: 'resume',
    name: 'Resume',
    description: 'A clean one-page resume.',
    icon: '👤',
    title: 'Resume',
    html: `
      <h1>[Your Name]</h1>
      <p>[Email] • [Phone] • [Location] • [LinkedIn]</p>
      <h2>Summary</h2>
      <p>A short professional summary…</p>
      <h2>Experience</h2>
      <h3>Job Title — Company</h3>
      <p><em>Dates</em></p>
      <ul><li>Achievement…</li><li>Achievement…</li></ul>
      <h2>Education</h2>
      <p>Degree — Institution — Year</p>
      <h2>Skills</h2>
      <p>Skill 1, Skill 2, Skill 3</p>
    `,
  },
  {
    key: 'project',
    name: 'Project plan',
    description: 'Goals, milestones and tasks.',
    icon: '📊',
    title: 'Project plan',
    html: `
      <h1>Project plan</h1>
      <h2>Overview</h2>
      <p>What is this project and why does it matter…</p>
      <h2>Goals</h2>
      <ul><li>Goal 1</li><li>Goal 2</li></ul>
      <h2>Milestones</h2>
      <ol><li>Milestone — date</li><li>Milestone — date</li></ol>
      <h2>Tasks</h2>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">Task…</li>
        <li data-type="taskItem" data-checked="false">Task…</li>
      </ul>
      <h2>Risks</h2>
      <blockquote>Note any risks or blockers here.</blockquote>
    `,
  },
  {
    key: 'todo',
    name: 'To-do list',
    description: 'A simple checklist.',
    icon: '✅',
    title: 'To-do list',
    html: `
      <h1>To-do list</h1>
      <ul data-type="taskList">
        <li data-type="taskItem" data-checked="false">First task</li>
        <li data-type="taskItem" data-checked="false">Second task</li>
        <li data-type="taskItem" data-checked="false">Third task</li>
      </ul>
    `,
  },
];

export function getTemplate(key: string | null | undefined): DocTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
