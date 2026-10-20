const modules = import.meta.glob(['./*.js', '!./index.js'], { eager: true, import: 'default' });
// One file per area (landing, app-creator, …), each a { "English": "Hinglish" } map.
export default Object.assign({}, ...Object.values(modules));
