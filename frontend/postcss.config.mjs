/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    'postcss-obfuscator': {
      enable: process.env.NODE_ENV === 'production', // only enable in production
      length: 5,
      classMethod: 'random',
      classPrefix: '',
      classSuffix: '',
      classIgnore: [],
      ids: false,
      idMethod: 'random',
      idPrefix: '',
      idSuffix: '',
      idIgnore: [],
      indicatorStart: null,
      indicatorEnd: null,
      jsonsPath: 'css-obfuscator',
      srcPath: '.',
      desPath: 'out',
      extensions: ['.html'],
      htmlExcludes: [],
      cssExcludes: [],
      fresh: false,
      multi: false,
      differMulti: false,
      formatJson: false,
      showConfig: false,
      keepData: true,
    },
  },
};

export default config;
