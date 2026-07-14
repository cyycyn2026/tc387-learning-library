"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type FocusKey = "trap" | "memory" | "autosar" | "c-pointer" | "daily";

type KnowledgeCard = {
  id: string;
  title: string;
  area: string;
  level: "不会" | "会用但不稳" | "需要工程化";
  summary: string;
  steps: string[];
  scenario: string;
  nextAction: string;
  accent: FocusKey;
  article: {
    opening: string;
    analogy: string;
    ladder: string[];
    checklist: string[];
    practice: string[];
  };
};

type CaptureNote = {
  id: string;
  title: string;
  source: string;
  tag: string;
  symptom: string;
  reason: string;
  action: string;
  createdAt: string;
};

const focusTabs: { key: FocusKey; label: string; hint: string }[] = [
  { key: "daily", label: "每日带学", hint: "每天推进一小块" },
  { key: "trap", label: "Trap 排查", hint: "调用栈到根因" },
  { key: "memory", label: "Memory Map", hint: "地址、段、链接" },
  { key: "autosar", label: "NvM / Fee", hint: "结合 ISOLAR 工具" },
  { key: "c-pointer", label: "C 指针", hint: "看懂真实用法" },
];

const knowledgeCards: KnowledgeCard[] = [
  {
    id: "trap-stack",
    title: "进 Trap 后，先从调用栈还原事故现场",
    area: "TriCore / Lauterbach",
    level: "需要工程化",
    summary:
      "先不要急着背 Trap 类型。第一步是用 Lauterbach 的调用栈、PC、A11 返回地址和异常上下文，判断代码是在哪里偏离正常路径的。",
    steps: [
      "保存 Trap 现场：PC、PSW、D15、A11、CSA 链、Trap class 和 TIN。",
      "看调用栈是否可信：栈断裂通常提示指针越界、CSA 损坏或栈/上下文被覆盖。",
      "回到最近一次业务调用：找到进入驱动、BSW 模块或回调函数的边界。",
      "结合 map 文件确认地址属于代码、RAM、外设寄存器还是非法区域。",
    ],
    scenario:
      "例如 NvM 写入后进 Trap，不要只盯 NvM。先确认崩溃地址是不是 Fee/Fls 回调、MemIf 适配层，还是用户传入的 RAM Block 指针。",
    nextAction: "整理一张 Lauterbach Trap 排查清单：截图、命令、字段解释、判断分支。",
    accent: "trap",
    article: {
      opening:
        "进 Trap 的第一反应不要是“这是哪个知识点我没背”，而是把它当成一个事故现场。事故现场最怕被破坏，所以你要先保存现场，再判断证据是否可信，最后沿着调用链往回找。",
      analogy:
        "可以把调用栈理解成电梯的楼层记录：程序从 main 一层层调用到驱动、回调、底层函数。Trap 就像电梯突然停住，调用栈能告诉你它大概经过了哪些楼层，但如果钢缆已经断了，楼层记录也可能乱掉。",
      ladder: [
        "第一层：确认 Trap class 和 TIN，只判断大方向，不立刻下结论。",
        "第二层：记录 PC、A11、PSW、D15、CSA 链，防止重启后证据丢失。",
        "第三层：用 Lauterbach 看调用栈，找最近一次从业务代码进入 BSW/MCAL 的边界。",
        "第四层：拿异常地址对 map 文件，判断它属于代码、RAM、Flash、外设寄存器还是非法区。",
        "第五层：回到最近一次指针、数组、函数指针、回调、NvM/Fee 缓冲区的使用点。",
      ],
      checklist: [
        "调用栈完整但停在某个函数：优先看该函数入参、局部指针、数组下标。",
        "调用栈断裂：优先怀疑栈、CSA、返回地址、非法函数指针或内存覆盖。",
        "PC 指向 RAM：确认是否允许从该 RAM 执行，通常要怀疑跳转地址错误。",
        "PC 指向 0x0 或固定异常值：优先看空指针、未初始化函数指针、结构体成员未配置。",
      ],
      practice: [
        "下次遇到 Trap，先截图调用栈、寄存器窗口和异常地址，不先重启。",
        "把异常 PC 放进 map 文件里查一次，写下它属于哪个 section。",
        "把最近一次函数调用的每个指针入参列出来，确认地址、长度、生命周期。",
      ],
    },
  },
  {
    id: "memory-map",
    title: "Memory Map 不是文件目录，是芯片地址世界的地图",
    area: "TC387 / Linker / LSL",
    level: "会用但不稳",
    summary:
      "Memory Map 让你知道代码、常量、变量、栈、堆、外设寄存器、Flash Bank 分别住在哪里。排查越界、初始化失败、启动异常时非常关键。",
    steps: [
      "先分清地址空间：PFlash、DFlash、DSPR、PSPR、LMU、外设寄存器。",
      "再看链接脚本如何把 section 放进去：text、rodata、data、bss、stack。",
      "最后把 map 文件和调试器地址对上，判断异常地址是否合理。",
      "遇到初始化值不对，要看 data 从 Flash 复制到 RAM 的启动流程。",
    ],
    scenario:
      "例如一个全局变量上电后不是期望值，可能不是 C 语法问题，而是 section 放置、启动复制表或清零流程出了问题。",
    nextAction: "建立 TC387 Memory Map 可视化页：地址段、用途、常见事故、调试入口。",
    accent: "memory",
    article: {
      opening:
        "Memory Map 的价值不是让你背地址，而是让你知道“这个地址为什么能用、为什么不能用、出了问题该往哪里查”。嵌入式里很多问题表面像 C 代码错了，实际是地址放置、初始化或访问权限错了。",
      analogy:
        "它像一座城市地图：PFlash 是档案馆，RAM 是办公桌，DFlash 是长期保存柜，外设寄存器是设备开关。你把临时草稿放进档案馆，或者把文件柜当开关，系统当然会出事。",
      ladder: [
        "第一层：分清存储区域用途，PFlash 放代码和常量，RAM 放运行时变量和栈。",
        "第二层：理解 section，知道 .text、.rodata、.data、.bss、stack 大致代表什么。",
        "第三层：看 linker/LSL 如何把 section 放到 TC387 的具体地址段。",
        "第四层：读 map 文件，把变量名、函数名、地址、大小关联起来。",
        "第五层：结合启动代码，看 data 复制、bss 清零、栈初始化有没有发生。",
      ],
      checklist: [
        "变量上电值不对：查 .data 是否被正确从 Flash 复制到 RAM。",
        "变量总是 0：查 .bss 清零是否覆盖了不该覆盖的区域。",
        "数组越界后异常：查越界地址是否落到栈、其他全局变量或外设寄存器。",
        "Flash 写失败：查目标地址属于 PFlash、DFlash 还是 Fee 管理区。",
      ],
      practice: [
        "找一个全局变量，在 map 文件中查到它的地址和 section。",
        "找一个函数地址，确认它落在 PFlash 的哪个区域。",
        "画出当前工程最常用的 6 个地址段：名称、用途、典型错误。",
      ],
    },
  },
  {
    id: "nvm-fee-isolar",
    title: "NvM / Fee 要从配置链路看，不要孤立背模块",
    area: "AUTOSAR BSW / ISOLAR",
    level: "需要工程化",
    summary:
      "NvM、MemIf、Fee、Fls 是一条链。ISOLAR 里配的是 Block、Device、Cluster、Job、回调和初始化关系，工程问题通常出在链路不一致。",
    steps: [
      "从 NvM Block 开始：Block ID、RAM Block、ROM Default、Immediate Data、Write Once。",
      "向下追 MemIf Device 和 Fee Block，确认 Block 映射和大小是否一致。",
      "看 Fee Cluster、Virtual Page、擦写策略，判断写入失败是否和 Flash 布局相关。",
      "结合 EcuM/BswM 初始化顺序，确认 NvM_ReadAll 和 NvM_WriteAll 的时机。",
    ],
    scenario:
      "例如标定值掉电不保存，可能是 NvM 没触发 WriteAll、Fee Job Pending、Fls 擦除失败，或者 RAM Block 地址配置错。",
    nextAction: "做一篇 ISOLAR 配置导览：从 NvM Block 点进去，一路追到 Fee/Fls。",
    accent: "autosar",
    article: {
      opening:
        "NvM/Fee 不能只背 API。你真正需要掌握的是一条配置链：应用要保存什么，NvM 怎么定义 Block，MemIf 怎么选择设备，Fee 怎么映射到虚拟 Flash，Fls 最终怎么擦写硬件。",
      analogy:
        "可以把 NvM 当成前台，Fee 是仓库管理员，Fls 是真正开门关门的工人。ISOLAR 配置就是告诉前台每个包裹叫什么、放哪个仓库、仓库格子多大、什么时候交给工人处理。",
      ladder: [
        "第一层：在 ISOLAR 里找到 NvM Block，确认 Block ID、长度、管理类型和默认值。",
        "第二层：确认 RAM Block 地址来源，区分 permanent RAM block 和临时 buffer。",
        "第三层：向下追 MemIf Device Index，看 NvM 请求到底交给哪个下层设备。",
        "第四层：检查 Fee Block、Cluster、Virtual Page、擦除策略和 DFlash 布局。",
        "第五层：结合 EcuM/BswM，看 ReadAll、WriteAll、MainFunction 调度是否真正执行。",
      ],
      checklist: [
        "掉电不保存：查是否调用 WriteBlock/WriteAll，以及写入结果是否真的 OK。",
        "读出默认值：查 ROM Default、ReadAll 时机、Block Valid 状态。",
        "偶发 pending：查 NvM_MainFunction、Fee_MainFunction、Fls_MainFunction 调度周期。",
        "写入后 Trap：查 RAM Block 指针、长度、对齐和 Fee/Fls 回调路径。",
      ],
      practice: [
        "在 ISOLAR 中选一个 NvM Block，从 NvM 一路截图到 Fee/Fls。",
        "写一张表：Block ID、长度、RAM 地址、默认值、下层 Fee Block。",
        "模拟一个掉电不保存问题，列出你会查的 8 个配置点。",
      ],
    },
  },
  {
    id: "c-pointer-scenes",
    title: "C 指针先按使用场景学，不要先啃定义",
    area: "C 语言 / 嵌入式",
    level: "会用但不稳",
    summary:
      "指针不是一个单独概念，它经常以数组访问、结构体传参、回调函数、内存映射寄存器、AUTOSAR 缓冲区的形式出现。",
    steps: [
      "数组场景：uint8* buffer 表示一段连续数据，不只是一个数字地址。",
      "结构体场景：ConfigType* cfg 让函数读取一整组配置，而不是复制大对象。",
      "回调场景：函数指针把底层事件交给上层处理。",
      "寄存器场景：volatile 指针告诉编译器这个地址背后是硬件。",
    ],
    scenario:
      "例如 Fee_Write(BlockNumber, DataBufferPtr) 里的 DataBufferPtr 不是玄学，它只是告诉 Fee 从哪一段 RAM 取待写入数据。",
    nextAction: "建立 C 指针 20 个工程例子：每个例子配图、错法、正确写法。",
    accent: "c-pointer",
    article: {
      opening:
        "指针不要从“地址变量”这四个字硬背。你可以先把它理解成“我不把东西搬过来，我只告诉你东西在哪里”。嵌入式里指针常常和效率、硬件地址、缓冲区、配置表、回调机制绑在一起。",
      analogy:
        "如果变量是一箱零件，普通传参像把整箱搬过去，指针像给对方仓库位置和货架号。对方可以直接去拿，但如果你给错位置，它也会真的去错地方。",
      ladder: [
        "第一层：普通变量指针，理解 int* p 指向一个 int。",
        "第二层：数组和 buffer，理解 uint8* data 指向一段连续数据。",
        "第三层：结构体指针，理解 ConfigType* cfg 指向一组配置。",
        "第四层：函数指针和回调，理解“把处理函数的入口地址传给别人”。",
        "第五层：volatile 寄存器指针，理解编译器不能随便优化硬件访问。",
      ],
      checklist: [
        "看到 *p：先问它指向谁，生命周期还在不在。",
        "看到 p[i]：先问数组长度是谁保证的。",
        "看到 &x：先问是不是把当前变量的地址交给别人。",
        "看到 void*：先问真实数据类型在哪里恢复。",
        "看到函数指针：先问这个回调什么时候被调用，入参是谁给的。",
      ],
      practice: [
        "把 Fee_Write 的 DataBufferPtr 画成 RAM 中的一段字节。",
        "写 5 个结构体指针例子：只读配置、修改状态、传入输出参数、数组遍历、回调上下文。",
        "收集项目里 10 个指针用法，给每个标注：指向谁、长度谁管、什么时候失效。",
      ],
    },
  },
];

const dailyPlan = [
  {
    day: "今天",
    title: "Trap 现场保存和调用栈判断",
    output: "完成一张 Trap 排查卡：现象、调用栈、可疑地址、下一步验证。",
  },
  {
    day: "明天",
    title: "Memory Map 与 map 文件阅读",
    output: "画出 TC387 常见地址段，并能说明变量为什么在那里。",
  },
  {
    day: "本周",
    title: "NvM 到 Fee 的 ISOLAR 配置链",
    output: "从一个 NvM Block 追到 Fee/Fls，写出配置路径和常见错误。",
  },
];

const weaknessRadar = [
  { label: "Trap 调用栈排查", value: 36, note: "能看现象，但缺少固定取证顺序" },
  { label: "Memory Map / LSL", value: 28, note: "知道有 map 文件，但工程用途还不稳" },
  { label: "NvM / Fee / ISOLAR", value: 32, note: "需要从配置链路建立整体感" },
  { label: "C 指针工程用法", value: 42, note: "能写一点，但读复杂入参会卡" },
  { label: "项目经验沉淀", value: 22, note: "需要把现场问题及时记录下来" },
];

const learningRules = [
  "每次学习只解决一个工程问题，不追求一次吃完整个模块。",
  "每篇文章必须能回答：是什么、为什么有它、项目里怎么用、坏了怎么查。",
  "新知识先粗糙记录，后面再整理成文章，不让完美主义阻止沉淀。",
  "凡是涉及 NvM/Fee，默认带上 ISOLAR 配置路径和下层模块链路。",
];

const seedNotes: CaptureNote[] = [
  {
    id: "seed-1",
    title: "NvM 写入后异常，先排除 RAM Block 指针",
    source: "项目经验模板",
    tag: "NvM / Fee",
    symptom: "写入动作后偶发 Trap 或数据未保存。",
    reason: "可能是 RAM Block 地址、长度、对齐或生命周期不对，导致 Fee 读取了错误缓冲区。",
    action: "在 ISOLAR 中核对 Block 长度，再用 Lauterbach 看 DataBufferPtr 指向的 RAM 地址是否有效。",
    createdAt: "2026-07-14",
  },
  {
    id: "seed-2",
    title: "调用栈断裂时，不要盲目信任最上层函数名",
    source: "Trap 排查模板",
    tag: "Trap",
    symptom: "Lauterbach 调用栈显示不完整，或者停在奇怪地址。",
    reason: "可能是 CSA 链损坏、栈被覆盖、函数指针跳转错误或非法地址执行。",
    action: "记录 PC/A11/CSA，结合 map 文件判断地址归属，再回看最近一次指针写入。",
    createdAt: "2026-07-14",
  },
];

const storageKey = "tc387-learning-library-notes";

export default function Home() {
  const [active, setActive] = useState<FocusKey>("daily");
  const [selectedId, setSelectedId] = useState("trap-stack");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<CaptureNote[]>(seedNotes);
  const [form, setForm] = useState({
    title: "",
    source: "",
    tag: "项目经验",
    symptom: "",
    reason: "",
    action: "",
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CaptureNote[];
        const missingSeeds = seedNotes.filter(
          (seed) => !parsed.some((note) => note.id === seed.id),
        );
        setNotes([...parsed, ...missingSeeds]);
      } catch {
        setNotes(seedNotes);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes]);

  const filteredCards = useMemo(() => {
    const text = query.trim().toLowerCase();
    return knowledgeCards.filter((card) => {
      const matchesTab = active === "daily" || card.accent === active;
      const blob = `${card.title} ${card.area} ${card.summary} ${card.scenario}`.toLowerCase();
      return matchesTab && (!text || blob.includes(text));
    });
  }, [active, query]);

  const filteredNotes = useMemo(() => {
    const text = query.trim().toLowerCase();
    return notes.filter((note) => {
      const blob = `${note.title} ${note.source} ${note.tag} ${note.symptom} ${note.reason} ${note.action}`.toLowerCase();
      return !text || blob.includes(text);
    });
  }, [notes, query]);

  const selectedCard =
    knowledgeCards.find((card) => card.id === selectedId) ?? knowledgeCards[0];

  function selectTab(key: FocusKey) {
    setActive(key);
    const firstMatch = knowledgeCards.find((card) => card.accent === key);
    if (firstMatch) setSelectedId(firstMatch.id);
  }

  function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    const nextNote: CaptureNote = {
      id: `note-${Date.now()}`,
      title: form.title.trim(),
      source: form.source.trim() || "电脑网页导入",
      tag: form.tag.trim() || "项目经验",
      symptom: form.symptom.trim() || "待补充现象",
      reason: form.reason.trim() || "待分析原因",
      action: form.action.trim() || "待整理下一步",
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setNotes((current) => [nextNote, ...current]);
    setForm({
      title: "",
      source: "",
      tag: "项目经验",
      symptom: "",
      reason: "",
      action: "",
    });
  }

  function exportNotes() {
    const payload = JSON.stringify(notes, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tc387-notes-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#17211b]">
      <section className="hero">
        <div className="hero__content">
          <div className="eyebrow">TC387 PERSONAL LEARNING LIBRARY</div>
          <h1>把半吊子的知识，整理成可排查、可复习、可复用的工程经验。</h1>
          <p>
            这里不面向别人展示，只服务你自己：每天推进一小块，把 Trap、Memory Map、NvM/Fee、C 指针这些薄弱点，逐步变成能在项目里用得上的判断力。
          </p>
          <div className="hero__actions" aria-label="资料库核心入口">
            <a href="#capture">新增项目经验</a>
            <a href="#daily">查看今日学习</a>
          </div>
        </div>
        <div className="hero__panel" aria-label="当前学习状态">
          <span>今日重点</span>
          <strong>Trap 现场保存</strong>
          <p>目标不是背概念，而是能从 Lauterbach 调用栈、异常地址和 map 文件定位下一步。</p>
          <div className="meter" aria-label="薄弱点掌握度">
            <i style={{ width: "38%" }} />
          </div>
          <small>当前阶段：会用一点，但需要形成排查路径</small>
        </div>
      </section>

      <section className="shell">
        <div className="toolbar" aria-label="学习资料筛选">
          <div>
            <span className="section-kicker">学习入口</span>
            <h2>先按场景找，再进入文章</h2>
          </div>
          <label className="search">
            <span>搜索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入 Trap、Fee、指针、map..."
            />
          </label>
        </div>

        <div className="tabs" role="tablist" aria-label="知识主题">
          {focusTabs.map((tab) => (
            <button
              key={tab.key}
              className={active === tab.key ? "tab tab--active" : "tab"}
              onClick={() => selectTab(tab.key)}
              type="button"
            >
              <strong>{tab.label}</strong>
              <span>{tab.hint}</span>
            </button>
          ))}
        </div>

        <section id="daily" className="daily-grid" aria-label="每日学习计划">
          {dailyPlan.map((item) => (
            <article key={item.day} className="daily-card">
              <span>{item.day}</span>
              <h3>{item.title}</h3>
              <p>{item.output}</p>
            </article>
          ))}
        </section>

        <section className="radar-section" aria-label="薄弱点雷达">
          <div className="section-heading section-heading--compact">
            <div>
              <span className="section-kicker">薄弱点雷达</span>
              <h2>先承认哪里不稳，系统才知道怎么带你补</h2>
            </div>
          </div>
          <div className="radar-grid">
            {weaknessRadar.map((item) => (
              <article key={item.label} className="radar-card">
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}%</span>
                </div>
                <div className="radar-bar" aria-label={`${item.label} 当前掌握度`}>
                  <i style={{ width: `${item.value}%` }} />
                </div>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="knowledge-grid" aria-label="知识文章入口">
          {filteredCards.map((card) => (
            <article key={card.id} className={`knowledge-card accent-${card.accent}`}>
              <div className="card-topline">
                <span>{card.area}</span>
                <em>{card.level}</em>
              </div>
              <h3>{card.title}</h3>
              <p>{card.summary}</p>
              <ol>
                {card.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="scenario">
                <strong>工程场景</strong>
                <p>{card.scenario}</p>
              </div>
              <div className="next-action">{card.nextAction}</div>
              <button
                className="read-button"
                type="button"
                onClick={() => setSelectedId(card.id)}
              >
                进入学习文章
              </button>
            </article>
          ))}
        </section>

        <section className={`article-reader accent-${selectedCard.accent}`} aria-label="学习文章阅读区">
          <div className="reader-aside">
            <span className="section-kicker">学习文章</span>
            <h2>{selectedCard.title}</h2>
            <p>{selectedCard.article.opening}</p>
            <div className="reader-label">{selectedCard.area}</div>
          </div>
          <article className="reader-main">
            <section>
              <h3>先用一个普通例子理解</h3>
              <p>{selectedCard.article.analogy}</p>
            </section>
            <section>
              <h3>循序渐进学习路径</h3>
              <ol>
                {selectedCard.article.ladder.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </section>
            <section>
              <h3>工程排查清单</h3>
              <ul>
                {selectedCard.article.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>下一次动手练习</h3>
              <div className="practice-grid">
                {selectedCard.article.practice.map((item, index) => (
                  <div key={item} className="practice-card">
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </section>

        <section className="rules-section" aria-label="资料库学习规则">
          <span className="section-kicker">这个资料库的规则</span>
          <div>
            {learningRules.map((rule) => (
              <p key={rule}>{rule}</p>
            ))}
          </div>
        </section>

        <section id="capture" className="capture-layout" aria-label="项目经验录入">
          <div className="capture-copy">
            <span className="section-kicker">电脑网页导入</span>
            <h2>把新知识先收进来，再慢慢整理</h2>
            <p>
              录入时不要求一次写完美。先把“现象、可能原因、下一步动作”留下，后面再扩展成学习文章或排查卡。
            </p>
            <div className="principles">
              <span>先记录项目现场</span>
              <span>再补概念解释</span>
              <span>最后沉淀排查路径</span>
            </div>
          </div>

          <form className="capture-form" onSubmit={addNote}>
            <label>
              标题
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="例如：Fee 写入失败后 NvM 数据未恢复"
              />
            </label>
            <div className="form-row">
              <label>
                来源
                <input
                  value={form.source}
                  onChange={(event) => setForm({ ...form, source: event.target.value })}
                  placeholder="项目、调试、同事提醒..."
                />
              </label>
              <label>
                标签
                <input
                  value={form.tag}
                  onChange={(event) => setForm({ ...form, tag: event.target.value })}
                  placeholder="Trap / NvM / 指针"
                />
              </label>
            </div>
            <label>
              现象
              <textarea
                value={form.symptom}
                onChange={(event) => setForm({ ...form, symptom: event.target.value })}
                placeholder="我看到了什么？报错、调用栈、异常行为是什么？"
              />
            </label>
            <label>
              可能原因
              <textarea
                value={form.reason}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder="我怀疑和哪个模块、配置、指针、地址有关？"
              />
            </label>
            <label>
              下一步动作
              <textarea
                value={form.action}
                onChange={(event) => setForm({ ...form, action: event.target.value })}
                placeholder="下一次我应该查什么、截图什么、验证什么？"
              />
            </label>
            <div className="form-actions">
              <button type="submit">保存经验</button>
              <button type="button" onClick={exportNotes} className="ghost-button">
                导出备份
              </button>
            </div>
          </form>
        </section>

        <section className="notes-section" aria-label="已保存项目经验">
          <div className="section-heading">
            <span className="section-kicker">项目经验库</span>
            <h2>已沉淀的现场记录</h2>
          </div>
          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <article key={note.id} className="note-card">
                <div>
                  <span>{note.tag}</span>
                  <time>{note.createdAt}</time>
                </div>
                <h3>{note.title}</h3>
                <p><strong>现象：</strong>{note.symptom}</p>
                <p><strong>可能原因：</strong>{note.reason}</p>
                <p><strong>下一步：</strong>{note.action}</p>
                <small>{note.source}</small>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
