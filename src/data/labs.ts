import type { LabDefinition, TraceEvent } from "../domain/model";
import codeSamples from "./lab-code.json" with { type: "json" };
const head = `import {useState, useEffect, useMemo, useCallback, useRef, memo, createContext, useContext} from 'react';
import {trace, useSnapshot, TraceBoundary} from '@observatory/lab';\n`;
const batch = (fixed: boolean) =>
  head +
  `
export default function App() {
  const [count, setCount] = useState(0);
  trace.render('Counter', {count});
  useSnapshot('Counter', {count});
  function increment() {
    trace.action('Три обновления', {before: count});
    ${fixed ? "setCount(n => n + 1);\n    setCount(n => n + 1);\n    setCount(n => n + 1);" : "setCount(count + 1);\n    setCount(count + 1);\n    setCount(count + 1);"}
  }
  return <section><span className="eyebrow">Счётчик</span><h1>{count}</h1>
    <p>Три вызова setCount. Какой будет результат?</p>
    <button onClick={increment}>Увеличить трижды</button></section>;
}`;
const closure = (fixed: boolean) =>
  head +
  `
export default function App() {
  const [count, setCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  useSnapshot('Counter', {count, waiting});
  function later() {
    trace.action('Отложить', {captured: count});
    setWaiting(true);
    setTimeout(() => {
      trace.effect('Timer', 'Таймер сработал', {captured: count});
      ${fixed ? "setCount(n => n + 1);" : "setCount(count + 1);"}
      setWaiting(false);
    }, 2000);
  }
  return <section><span className="eyebrow">Замыкание</span><h1>{count}</h1>
    <p>{waiting ? 'Таймер запущен. Нажмите «+1 сейчас».' : 'Отложите обновление, затем увеличьте значение.'}</p>
    <button disabled={waiting} onClick={later}>+1 через 2 секунды</button>
    <button className="secondary" onClick={() => { trace.action('Сейчас'); setCount(n => n + 1); }}>+1 сейчас</button></section>;
}`;
const effects = (fixed: boolean) =>
  head +
  `
function Clock() {
  const [ticks, setTicks] = useState(0);
  useSnapshot('Clock', {ticks});
  useEffect(() => {
    trace.effect('Clock', 'Подписка создана');
    const timer = setInterval(() => { setTicks(n => n + 1); trace.event('Тик подписки'); }, 700);
    ${fixed ? "return () => { clearInterval(timer); trace.cleanup('Clock'); };" : "// Что произойдёт с timer при размонтировании?"}
  }, []);
  return <h1>{ticks}<small> тиков</small></h1>;
}
export default function App() {
  const [visible, setVisible] = useState(true);
  return <section><span className="eyebrow">Жизненный цикл</span>
    {visible ? <Clock/> : <h2>Компонент скрыт</h2>}
    <p>Следите за журналом после выключения часов.</p>
    <button onClick={() => { trace.action(visible ? 'Скрыть часы' : 'Показать часы'); setVisible(v => !v); }}>
      {visible ? 'Скрыть часы' : 'Показать часы'}</button></section>;
}`;
const keys = (fixed: boolean) =>
  head +
  `
const initial = [{id:'a',title:'Дизайн'}, {id:'b',title:'Разработка'}, {id:'c',title:'Проверка'}];
function Row({item}) {
  const [value, setValue] = useState(item.title);
  useSnapshot('Row:' + item.id, {id:item.id, value, title:item.title});
  return <label className="task-row"><span>{item.id}</span><input aria-label={'Задача ' + item.id} value={value}
    onChange={e => {trace.action('Редактирование', {id:item.id, value:e.target.value}); setValue(e.target.value);}}/></label>;
}
export default function App() {
  const [items, setItems] = useState(initial);
  return <section><span className="eyebrow">Идентичность</span><h2>План проекта</h2>
    <p>Измените первую задачу и переверните список.</p>
    {items.map((item, index) => <Row key={${fixed ? "item.id" : "index"}} item={item}/>)}
    <button onClick={() => {trace.action('Перевернуть');setItems(items => [...items].reverse());}}>Перевернуть список</button></section>;
}`;
const memoCode = (fixed: boolean) =>
  head +
  `
const Chart = memo(function Chart({data, onSelect}) {
  trace.render('Chart');
  return <div className="chart" onClick={onSelect}>{data.map((n,i) => <div key={i} style={{height:n * 2 + 'px'}}/> )}</div>;
});
export default function App() {
  const [count, setCount] = useState(0);
  trace.render('Dashboard', {count});
  const data = ${fixed ? "useMemo(() => [28, 52, 38, 76, 60], [])" : "[28, 52, 38, 76, 60]"};
  const onSelect = ${fixed ? "useCallback(() => trace.action('Выбор графика'), [])" : "() => trace.action('Выбор графика')"};
  return <section><span className="eyebrow">Стабильные ссылки</span><h2>Аналитика проекта</h2>
    <Chart data={data} onSelect={onSelect}/><p>Несвязанное состояние: {count}</p>
    <button onClick={() => {trace.action('Обновить панель');setCount(n => n + 1);}}>Обновить панель</button></section>;
}`;
const contextCode = (fixed: boolean) =>
  head +
  `
const UserContext = createContext(${fixed ? "'Алексей'" : "{name:'Алексей',dark:false}"});
${fixed ? "const ThemeContext = createContext(false);" : ""}
const Profile = memo(function Profile() {
  const user = useContext(UserContext);
  trace.render('Profile');
  return <h2>Привет, {${fixed ? "user" : "user.name"}}!</h2>;
});
export default function App() {
  const [dark, setDark] = useState(false);
  trace.render('Provider', {dark});
  const content = <section style={{background:dark?'#1e2b45':'#fff',color:dark?'#fff':'#182336'}}>
    <span className="eyebrow">Границы контекста</span><Profile/>
    <p>Профиль использует только имя. Должна ли тема обновлять профиль?</p>
    <button onClick={() => {trace.action('Сменить тему');setDark(v => !v);}}>Сменить тему</button></section>;
  return ${fixed ? '<UserContext.Provider value="Алексей"><ThemeContext.Provider value={dark}>{content}</ThemeContext.Provider></UserContext.Provider>' : '<UserContext.Provider value={{name:"Алексей",dark}}>{content}</UserContext.Provider>'};
}`;
const frames = (fixed: boolean) =>
  head +
  `import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import {Player} from '@remotion/player';
function Animation() {
  const frame = useCurrentFrame();
  const opacity = ${fixed ? "interpolate(frame, [0,60], [0,1], {extrapolateLeft:'clamp',extrapolateRight:'clamp'})" : "frame < 45 ? 0 : 1"};
  useSnapshot('Animation', {frame, opacity});
  return <AbsoluteFill style={{justifyContent:'center',alignItems:'center',background:'#edf1ff'}}>
    <div style={{opacity,fontSize:42,color:'#2955e8',fontWeight:700}}>Привет, кадр!</div>
  </AbsoluteFill>;
}
export default function App() {
  const player = useRef(null);
  return <section><span className="eyebrow">Время в Remotion</span><h2>Появление заголовка</h2>
    <Player ref={player} component={Animation} durationInFrames={90} compositionWidth={600} compositionHeight={240} fps={30} controls style={{width:'100%'}}/>
    <p>На кадре 30 прозрачность должна быть 0.5.</p>
    <button onClick={() => {trace.action('Кадр 30');player.current?.seekTo(30);}}>Кадр 30</button></section>;
}`;
const springs = (fixed: boolean) =>
  head +
  `import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring} from 'remotion';
import {Player} from '@remotion/player';
function Animation() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const a = spring({frame, fps, config:{damping:18,stiffness:90}});
  const b = spring({frame:${fixed ? "frame - 12" : "frame"}, fps, config:{damping:18,stiffness:90}});
  useSnapshot('Springs', {frame, a, b});
  return <AbsoluteFill style={{justifyContent:'center',gap:20,padding:30,background:'#edf1ff'}}>
    {[a,b].map((value,i) => <div key={i} style={{width:(value*85+5)+'%',height:32,borderRadius:6,background:i?'#8c74cf':'#2955e8'}}/>)}
  </AbsoluteFill>;
}
export default function App() {
  const player = useRef(null);
  return <section><span className="eyebrow">Хореография</span><h2>Движение с задержкой</h2>
    <Player ref={player} component={Animation} durationInFrames={100} compositionWidth={600} compositionHeight={240} fps={30} controls style={{width:'100%'}}/>
    <p>Второй элемент должен начинать на 12 кадров позже.</p>
    <button onClick={() => {trace.action('Кадр 18');player.current?.seekTo(18);}}>Кадр 18</button></section>;
}`;
const snapshot = (es: TraceEvent[], key: string, value: unknown) =>
  es.some((e) => e.kind === "snapshot" && e.data?.[key] === value);
const action = (es: TraceEvent[], name: string) =>
  es.some((e) => e.kind === "action" && e.label === name);
const count = (es: TraceEvent[], scope: string) =>
  es.filter((e) => e.kind === "render" && e.scope === scope).length;
export const rawLabs: LabDefinition[] = [
  {
    id: "batching",
    number: "01",
    title: "Три обновления. Один результат.",
    short: "Состояние и пакетные обновления",
    category: "React",
    difficulty: "Базовый",
    minutes: 8,
    color: "#2955e8",
    tags: ["useState", "batching"],
    question: "Три раза setCount(count + 1). Счётчик увеличится на 1 или на 3?",
    summary:
      "Почему три вызова обновления не всегда означают три изменения состояния. Разбираемся на одном счётчике.",
    explanation:
      "Каждый обработчик видит снимок состояния своего рендера. При count = 0 все три вызова передают одно значение: 1. React обрабатывает очередь после обработчика и применяет результат.",
    solution:
      "Передайте функцию обновления: setCount(n => n + 1). Каждая функция получает результат предыдущей. Очередь вычисляет 0 → 1 → 2 → 3.",
    conclusion:
      "Значение принадлежит рендеру. Функция обновления работает с очередью.",
    source: batch(false),
    fixedSource: batch(true),
    steps: [
      "Предскажите результат трёх вызовов",
      "Нажмите «Увеличить трижды»",
      "Сравните вызовы и коммиты",
      "Переключитесь на исправление и повторите",
    ],
    diagram: ["Событие", "Очередь", "Новый снимок"],
    tasks: [
      {
        question: "Чему равен count после первого клика в исходном примере?",
        options: ["1", "3", "0"],
        answer: 0,
        explanation:
          "Все три вызова передают count + 1 из одного снимка: 0 + 1.",
      },
      {
        question: "Что получает функция n => n + 1?",
        options: [
          "Начальное значение компонента",
          "Результат предыдущего обновления",
          "Номер текущего рендера",
        ],
        answer: 1,
        explanation:
          "React последовательно передаёт результат каждой функции следующей функции в очереди.",
      },
    ],
    verify: {
      instruction:
        "Запустите исправленный код и один раз нажмите «Увеличить трижды». Результат должен быть 3.",
      check: (es) => {
        const actions = es.filter(
          (e) => e.kind === "action" && e.label === "Три обновления",
        );
        return actions.some(
          (a, i) =>
            typeof a.data?.before === "number" &&
            es.some(
              (e) =>
                e.seq > a.seq &&
                (!actions[i + 1] || e.seq < actions[i + 1].seq) &&
                e.kind === "snapshot" &&
                e.data?.count === a.data.before + 3,
            ),
        );
      },
    },
  },
  {
    id: "closures",
    number: "02",
    title: "Таймер помнит прошлое.",
    short: "Замыкания и отложенные обновления",
    category: "React",
    difficulty: "Средний",
    minutes: 10,
    color: "#9364bc",
    tags: ["closures", "useState"],
    question:
      "Таймер запомнил 0. Пока он ждал, состояние изменилось. Что он запишет?",
    summary:
      "Поймайте устаревшее замыкание: отложенное действие перезаписывает новое значение.",
    explanation:
      "Функция таймера замыкает count из рендера, в котором она была создана. Даже если интерфейс уже показывает 1, таймер вычисляет 0 + 1 и снова записывает 1.",
    solution:
      "Функциональное обновление setCount(n => n + 1) берёт актуальный результат очереди. После немедленного и отложенного обновлений получится 2.",
    conclusion:
      "Замыкание сохраняет значения рендера, а не живую ссылку на состояние.",
    source: closure(false),
    fixedSource: closure(true),
    steps: [
      "Поставьте отложенное обновление",
      "Сразу нажмите «+1 сейчас»",
      "Подождите две секунды",
      "Сравните captured и итоговый count",
    ],
    diagram: ["Снимок", "Таймер", "Новое состояние"],
    tasks: [
      {
        question: "Какое значение count видит callback таймера?",
        options: [
          "Всегда последнее",
          "Значение рендера, создавшего callback",
          "Случайное",
        ],
        answer: 1,
        explanation: "Callback сохраняет своё лексическое окружение.",
      },
      {
        question: "Как увеличить актуальное состояние?",
        options: [
          "Повторить setCount(count + 1)",
          "Передать setCount(n => n + 1)",
          "Увеличить задержку",
        ],
        answer: 1,
        explanation: "Функция обновления получает состояние из очереди React.",
      },
    ],
    verify: {
      instruction:
        "На свежем исправленном запуске: «+1 через 2 секунды», затем «+1 сейчас». Дождитесь значения 2.",
      check: (es) =>
        action(es, "Отложить") &&
        action(es, "Сейчас") &&
        es.some(
          (e) =>
            e.kind === "snapshot" &&
            e.data?.count === 2 &&
            e.data?.waiting === false,
        ),
    },
  },
  {
    id: "effects",
    number: "03",
    title: "Компонент ушёл. Таймер остался.",
    short: "Эффекты и очистка подписок",
    category: "React",
    difficulty: "Средний",
    minutes: 10,
    color: "#bd8040",
    tags: ["useEffect", "cleanup"],
    question: "Компонент исчез с экрана. Остановится ли созданный им интервал?",
    summary:
      "Наблюдайте жизненный цикл подписки и найдите работу, которая продолжается после размонтирования.",
    explanation:
      "Размонтирование компонента само по себе не отменяет setInterval. Без очистки callback продолжает выполняться. Strict Mode помогает заметить отсутствующую симметрию setup и cleanup.",
    solution:
      "Верните из useEffect функцию очистки, которая вызывает clearInterval(timer). React вызовет её перед следующим запуском эффекта и при размонтировании.",
    conclusion: "Каждой внешней подписке нужен симметричный способ завершения.",
    source: effects(false),
    fixedSource: effects(true),
    steps: [
      "Дождитесь нескольких тиков",
      "Скройте часы",
      "Проверьте журнал",
      "Добавьте cleanup и повторите",
    ],
    diagram: ["Подписка", "Работа", "Очистка"],
    tasks: [
      {
        question: "Что React автоматически сделает с setInterval?",
        options: [
          "Отменит при unmount",
          "Ничего: нужна функция очистки",
          "Отменит через секунду",
        ],
        answer: 1,
        explanation:
          "Таймер принадлежит браузеру; React вызывает вашу функцию очистки.",
      },
      {
        question: "Когда вызывается cleanup?",
        options: [
          "Только при закрытии вкладки",
          "Перед повторным setup и при unmount",
          "После каждого клика",
        ],
        answer: 1,
        explanation: "Очистка завершает предыдущую синхронизацию перед новой.",
      },
    ],
    verify: {
      instruction:
        "Скройте часы в исправленном примере. В журнале должна появиться очистка Clock.",
      check: (es) =>
        action(es, "Скрыть часы") &&
        es.some((e) => e.kind === "cleanup" && e.scope === "Clock"),
    },
  },
  {
    id: "keys",
    number: "04",
    title: "Состояние ищет свой адрес.",
    short: "Ключи и идентичность компонентов",
    category: "React",
    difficulty: "Средний",
    minutes: 12,
    color: "#178b7a",
    tags: ["keys", "identity"],
    question:
      "При смене порядка состояние должно остаться у задачи или у позиции?",
    summary:
      "Отредактируйте список и поменяйте порядок. Нестабильные ключи сразу станут видны.",
    explanation:
      "С ключом index React сопоставляет элементы по позиции. При перестановке другой item попадает в прежний компонент, а локальное состояние остаётся на старом месте.",
    solution:
      "Используйте стабильный item.id. Тогда идентичность и состояние перемещаются вместе с элементом данных.",
    conclusion:
      "Ключ описывает идентичность элемента среди соседей, а не его позицию.",
    source: keys(false),
    fixedSource: keys(true),
    steps: [
      "Измените задачу a",
      "Переверните список",
      "Сопоставьте id и текст",
      "Повторите со стабильными ключами",
    ],
    diagram: ["Задача", "Ключ компонента", "Локальное состояние"],
    tasks: [
      {
        question: "Где сохранится useState при key={index}?",
        options: ["У прежней позиции", "Всегда у item.id", "Сбросится у всех"],
        answer: 0,
        explanation: "React сохраняет компонент по его типу, позиции и ключу.",
      },
      {
        question: "Какой ключ подходит для переставляемых задач?",
        options: ["Math.random()", "index", "Стабильный id из данных"],
        answer: 2,
        explanation:
          "Стабильный ключ позволяет сопоставить задачу до и после перестановки.",
      },
    ],
    verify: {
      instruction:
        "В исправленном примере измените задачу a и переверните список. Изменённый текст должен остаться у a.",
      check: (es) => {
        const reverse = es
          .filter((e) => e.kind === "action" && e.label === "Перевернуть")
          .at(-1);
        const edit = reverse
          ? es
              .filter(
                (e) =>
                  e.kind === "action" &&
                  e.label === "Редактирование" &&
                  e.data?.id === "a" &&
                  e.seq < reverse.seq,
              )
              .at(-1)
          : undefined;
        return (
          !!edit &&
          !!reverse &&
          es.some(
            (e) =>
              e.seq > reverse.seq &&
              e.kind === "snapshot" &&
              e.data?.id === "a" &&
              e.data?.value === edit.data.value,
          )
        );
      },
    },
  },
  {
    id: "memo",
    number: "05",
    title: "Те же данные. Новые ссылки.",
    short: "Мемоизация без магии",
    category: "React",
    difficulty: "Продвинутый",
    minutes: 12,
    color: "#537db5",
    tags: ["memo", "useMemo", "useCallback"],
    question: "Почему memo не помогает, если содержимое массива не изменилось?",
    summary:
      "Сравните реальные вызовы родителя и графика. Уберите ненужные обновления стабильными props.",
    explanation:
      "На каждом рендере создаются новый массив и новая функция. memo сравнивает props через Object.is: новые ссылки не равны предыдущим, даже если содержимое одинаковое.",
    solution:
      "Стабилизируйте массив через useMemo, обработчик через useCallback. Проверяйте измерениями, что оптимизация действительно сокращает работу.",
    conclusion:
      "Мемоизация работает с идентичностью props. Сначала наблюдение, потом оптимизация.",
    source: memoCode(false),
    fixedSource: memoCode(true),
    steps: [
      "Обновите панель дважды",
      "Посчитайте вызовы Chart",
      "Стабилизируйте props",
      "Сравните журнал",
    ],
    diagram: ["Dashboard", "Ссылки props", "Chart"],
    tasks: [
      {
        question: "Что сравнивает memo по умолчанию?",
        options: [
          "JSON всех props",
          "Каждый prop через Object.is",
          "Текст компонента",
        ],
        answer: 1,
        explanation:
          "Равное содержимое не делает два разных массива одной ссылкой.",
      },
      {
        question: "Что сохраняет useCallback?",
        options: [
          "Результат вызова функции",
          "Ссылку на функцию между изменениями зависимостей",
          "Все рендеры дочернего компонента",
        ],
        answer: 1,
        explanation:
          "useCallback возвращает прежнюю функцию, пока зависимости равны.",
      },
    ],
    verify: {
      instruction:
        "В исправленном примере нажмите «Обновить панель» дважды. Dashboard должен вызываться чаще Chart.",
      check: (es) =>
        es.filter((e) => e.label === "Обновить панель").length >= 2 &&
        count(es, "Chart") > 0 &&
        count(es, "Dashboard") > count(es, "Chart"),
    },
  },
  {
    id: "context",
    number: "06",
    title: "Одно изменение. Лишние обновления.",
    short: "Контекст и границы ответственности",
    category: "React",
    difficulty: "Продвинутый",
    minutes: 12,
    color: "#c26b77",
    tags: ["Context", "Provider"],
    question: "Профиль читает имя. Почему смена темы вызывает его снова?",
    summary:
      "Разделите контексты по смыслу и проследите, как меняется область обновлений.",
    explanation:
      "Provider передаёт новый объект при смене темы. Потребитель подписан на весь контекст, поэтому memo не блокирует обновление от нового context value.",
    solution:
      "Разделите имя и тему на независимые контексты. Стабильное имя больше не меняется вместе с темой; memo блокирует обычное обновление от родителя.",
    conclusion:
      "Граница контекста определяет область подписки. Разделяйте данные по тому, как они изменяются.",
    source: contextCode(false),
    fixedSource: contextCode(true),
    steps: [
      "Смените тему дважды",
      "Найдите вызовы Profile",
      "Разделите контексты",
      "Повторите эксперимент",
    ],
    diagram: ["Provider", "Контекст", "Profile"],
    tasks: [
      {
        question: "Блокирует ли memo новое значение читаемого контекста?",
        options: ["Да, всегда", "Нет", "Только в Strict Mode"],
        answer: 1,
        explanation:
          "Подписка на контекст обновляет потребителя независимо от memo.",
      },
      {
        question: "Что уменьшит связанные обновления?",
        options: [
          "Новый объект value на каждом рендере",
          "Разделение независимых контекстов",
          "Удаление всех Provider",
        ],
        answer: 1,
        explanation:
          "Потребитель имени не должен подписываться на изменения темы.",
      },
    ],
    verify: {
      instruction:
        "В исправленном варианте смените тему дважды. Provider должен вызываться чаще Profile.",
      check: (es) =>
        es.filter((e) => e.label === "Сменить тему").length >= 2 &&
        count(es, "Profile") > 0 &&
        count(es, "Provider") > count(es, "Profile"),
    },
  },
  {
    id: "frames",
    number: "07",
    title: "Время, которое можно перемотать.",
    short: "Кадры и интерполяция Remotion",
    category: "Remotion",
    difficulty: "Базовый",
    minutes: 9,
    color: "#2955e8",
    tags: ["interpolate", "Sequence"],
    question: "Что должно быть на кадре 30, если появление длится 60 кадров?",
    summary:
      "Замените резкий скачок прозрачности плавной функцией кадра и проверьте середину анимации.",
    explanation:
      "Порог frame < 45 переключает прозрачность скачком. Для воспроизводимой плавной анимации значение должно вычисляться из текущего кадра по заданной кривой.",
    solution:
      "interpolate переводит диапазон кадров [0,60] в прозрачность [0,1]. Ограничение clamp сохраняет допустимые значения вне диапазона.",
    conclusion:
      "Кадр — входные данные анимации. Один кадр всегда даёт один результат.",
    source: frames(false),
    fixedSource: frames(true),
    steps: [
      "Откройте кадр 30",
      "Посмотрите opacity",
      "Примените interpolate",
      "Перемотайте назад и повторите",
    ],
    diagram: ["Текущий кадр", "interpolate", "Прозрачность"],
    tasks: [
      {
        question: "Какова длительность 60 кадров при 30 fps?",
        options: ["1 секунда", "2 секунды", "60 секунд"],
        answer: 1,
        explanation: "Длительность равна количеству кадров, делённому на fps.",
      },
      {
        question: "Зачем нужен extrapolateRight: clamp?",
        options: [
          "Ограничить значение после диапазона",
          "Ускорить React",
          "Добавить случайность",
        ],
        answer: 0,
        explanation:
          "После последнего ключевого кадра значение остаётся у правой границы.",
      },
    ],
    verify: {
      instruction:
        "В исправленном примере нажмите «Кадр 30». В снимке должна быть opacity = 0.5.",
      check: (es) =>
        action(es, "Кадр 30") &&
        es.some(
          (e) =>
            e.kind === "snapshot" &&
            e.data?.frame === 30 &&
            e.data?.opacity === 0.5,
        ),
    },
  },
  {
    id: "springs",
    number: "08",
    title: "Движение по очереди.",
    short: "Пружины и хореография",
    category: "Remotion",
    difficulty: "Средний",
    minutes: 11,
    color: "#9364bc",
    tags: ["spring", "stagger"],
    question: "Как запустить вторую пружину на 12 кадров позже первой?",
    summary:
      "Постройте последовательное движение двух элементов через локальное время анимации.",
    explanation:
      "Одинаковый frame даёт обеим пружинам одинаковый прогресс. Чтобы сдвинуть начало, нужно передать второй пружине локальный кадр относительно её старта.",
    solution:
      "Передайте frame - 12 второй пружине. При общем кадре 18 первая считает 18, а вторая — 6; их прогресс различается.",
    conclusion:
      "Сложная хореография складывается из простых анимаций с собственным временем.",
    source: springs(false),
    fixedSource: springs(true),
    steps: [
      "Перейдите на кадр 18",
      "Сравните a и b",
      "Сдвиньте локальный frame",
      "Проверьте последовательность",
    ],
    diagram: ["Общий кадр", "Локальное время", "Пружина"],
    tasks: [
      {
        question: "Какой локальный кадр у второй пружины на общем кадре 18?",
        options: ["30", "18", "6"],
        answer: 2,
        explanation: "Локальное время: 18 − 12 = 6.",
      },
      {
        question: "Что сохраняет воспроизводимость движения?",
        options: [
          "setTimeout в useEffect",
          "Вычисление из frame и fps",
          "Случайная задержка",
        ],
        answer: 1,
        explanation:
          "Каждый кадр должен зависеть от входных данных, а не от времени выполнения.",
      },
    ],
    verify: {
      instruction:
        "В исправленном примере нажмите «Кадр 18». Прогресс b должен быть меньше a.",
      check: (es) =>
        action(es, "Кадр 18") &&
        es.some(
          (e) =>
            e.kind === "snapshot" &&
            e.data?.frame === 18 &&
            e.data?.b > 0 &&
            e.data?.b < e.data?.a,
        ),
    },
  },
];
export const labs: LabDefinition[] = rawLabs.map((l) => ({
  ...l,
  ...((codeSamples as Record<string, { source: string; fixedSource: string }>)[
    l.id
  ] || {}),
}));
export const getLab = (id: string) => labs.find((l) => l.id === id);
