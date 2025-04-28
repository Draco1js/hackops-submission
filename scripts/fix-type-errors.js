import fs from 'fs';
import path from 'path';

// Path to the App.test.tsx file
const appTestPath = path.resolve('packages/client/src/__tests__/App.test.tsx');

// Read the file
let content = fs.readFileSync(appTestPath, 'utf8');

// Fix the (todos: unknown) => void issue by adding a type assertion
content = content.replace(
  /setTodos\s*=\s*\(\s*todos\s*\)\s*=>/,
  'setTodos = (todos: Todo[]) =>'
);

// Fix the usersCount issue by improving the type definition
content = content.replace(
  /socketCallbacks\s*=\s*{/,
  'socketCallbacks: {[key: string]: ((...args: any[]) => void) | undefined} = {'
);

// Fix the HTMLFormElement | null issue by adding a null check
content = content.replace(
  /fireEvent\.submit\(\s*form\s*\)/,
  'form && fireEvent.submit(form)'
);

// Write the changes back to the file
fs.writeFileSync(appTestPath, content);

console.log('Type errors fixed in App.test.tsx');