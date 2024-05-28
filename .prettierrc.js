module.exports = {
  plugins: [
    require.resolve('prettier-plugin-sh'),
    require.resolve('prettier-plugin-organize-imports'),
    require.resolve('prettier-plugin-packagejson'),
    require.resolve('prettier-plugin-sort-json'),
    require.resolve('@trivago/prettier-plugin-sort-imports'),
    require.resolve('prettier-plugin-tailwindcss'),
  ],
  // 宽度
  printWidth: 120,

  // tab 缩进大小
  tabWidth: 2,

  // 使用空格缩进
  useTabs: false,

  // 不要在句尾添加分号
  semi: false,

  // 使用单引号
  singleQuote: true,

  // 对多行的逗号、对象等加尾随逗号
  trailingComma: 'all',

  // 在对象字面量声明的时候插入空格
  bracketSpacing: true,

  // 在箭头函数的参数周围都加上圆括号
  arrowParens: 'always',

  // 在 JSX 中使用单引号
  jsxSingleQuote: true,

  //换行符
  endOfLine: 'lf',
}
