import * as monaco from 'monaco-editor';

import latex from './monaco-latex.json';
import bibtex from './monaco-bibtex.json';

let registered = false;

export function monacoRegister() {
  if (registered) return;

  // https://github.com/koka-lang/madoko/blob/master/styles/lang/latex.json
  monaco.languages.register({ id: 'latex' });
  monaco.languages.setMonarchTokensProvider('latex', latex as monaco.languages.IMonarchLanguage);

  // https://github.com/koka-lang/madoko/blob/master/styles/lang/bibtex.json
  monaco.languages.register({ id: 'bibtex' });
  monaco.languages.setMonarchTokensProvider('bibtex', bibtex as monaco.languages.IMonarchLanguage);

  registered = true;
}
