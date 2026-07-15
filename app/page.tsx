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

type ResourcePack = {
  id: string;
  title: string;
  count: string;
  files: string[];
  learn: string;
  use: string;
  firstRead: string;
  detail: string[];
  checkpoints: string[];
};

type StudyQueueItem = {
  day: string;
  title: string;
  detail: string;
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

const resourcePacks: ResourcePack[] = [
  {
    id: "dtc-upload",
    title: "DTC 主动上传与诊断通信",
    count: "6 份",
    files: ["DTC主动上传需求", "I293系统功能定义", "DiagAgent.c", "UploadDtc.c", "BSW诊断通信总结"],
    learn: "从故障产生、Dem 记录、上传触发、通信发送到失败重试，建立一条完整问题链。",
    use: "下次遇到 DTC 不上报、重复上报或报码不一致时，按触发条件、状态机、通信路径、NVM 记录四步定位。",
    firstRead: "先从 DTC 主动上传需求和 I293 功能定义读起，再回到 DiagAgent / UploadDtc 代码看状态机和发送路径。",
    detail: ["这组资料解决的是“故障已经产生，软件怎么判断要不要主动告诉外部系统”。", "阅读时不要先陷进每个宏定义，先画出触发源、筛选条件、上传接口、失败重试、持久化记录。", "代码资料适合拿来训练调用链阅读：从周期函数或入口函数开始，沿着状态变量、发送函数、日志函数往下追。"],
    checkpoints: ["DTC 触发条件在哪里判断", "上传报文由哪个模块组帧", "失败后是否记录到 NVM 或日志", "重复上传如何抑制"],
  },
  {
    id: "uds-did-eol",
    title: "UDS / DID / EOL / 刷写",
    count: "5 份",
    files: ["EOL_DID学习资料", "EOL_DID逻辑136/90", "UDS诊断与刷写", "OBC CALID/CVN NVM", "DiagAgent日志"],
    learn: "把 DID 当成诊断服务和项目数据之间的接口，重点看 EOL 写入、读出、刷写日志和 CALID/CVN 存储。",
    use: "排查 DID 读不出来时，先确认服务 ID、DID 映射、数据来源、NVM Block 和会话/安全条件。",
    firstRead: "先看 EOL_DID 学习资料建立概念，再用 136/90 逻辑和 CALID/CVN 资料追一个真实 DID 的数据来源。",
    detail: ["这组资料的核心不是背 UDS 服务号，而是理解“诊断请求如何拿到项目里的真实数据”。", "EOL 数据、CALID/CVN、刷写日志通常都不是凭空返回，而是来自 RAM、NVM、标定区或刷写过程记录。", "学习时选一个 DID 做样本，追完整链路：请求进入、条件检查、数据读取、响应组帧、异常响应。"],
    checkpoints: ["DID 表在哪里配置", "数据源来自 RAM 还是 NVM", "读写需要什么会话和安全等级", "异常响应 NRC 对应什么失败条件"],
  },
  {
    id: "nvm-fee-fls",
    title: "NvM / Fee / Fls 存储体系",
    count: "10 份",
    files: ["autosar_nvm_fee_guide", "FEE vs Fls", "ReadAll/WriteAll", "NvM vs NvMDat", "NVM全体系"],
    learn: "从 NvM Block 追到 MemIf、Fee、Fls，理解下电存储、上电读取、Block 映射和 ISOLAR 配置。",
    use: "遇到掉电不保存、上电默认值、Fee pending、读写失败时，按 NvM 请求、Block 配置、Fee 队列、Fls 状态逐层排查。",
    firstRead: "先读 ReadAll/WriteAll 调用链，再看 FEE vs Fls 分层，最后回到 ISOLAR 里的 NvM Block 配置。",
    detail: ["这组资料最适合补你提到的 NvM/Fee 薄弱点，因为它能把配置、调用链和物理 Flash 行为连起来。", "NvM_WriteAll 不是瞬间把数据写进 Flash，而是发起请求，后面依赖 MemIf/Fee/Fls 的 MainFunction 推进。", "学习时一定要把 ISOLAR 配置截图和代码调用链放在一起看，否则很容易只懂概念，不会排查。"],
    checkpoints: ["NvM Block ID 和 Fee Block 是否映射一致", "RAM Block 地址和长度是否正确", "ReadAll/WriteAll 由谁触发", "Fee/Fls MainFunction 是否持续调度"],
  },
  {
    id: "can-nm",
    title: "CAN/CANFD 网络管理",
    count: "1 份",
    files: ["VTS CAN(CANFD)网络管理规范"],
    learn: "把网络管理看成车辆通信的睡眠、唤醒和保持在线规则，和诊断通信、下电存储放在一起理解。",
    use: "排查诊断掉线、无法休眠、唤醒后状态异常时，先看 NM 状态、报文周期、节点请求和 BswM/EcuM 联动。",
    firstRead: "先读网络管理状态和报文周期，再把它和诊断在线、下电存储、EcuM/BswM 状态切换联系起来。",
    detail: ["CAN 网络管理不是孤立通信规范，它会影响 ECU 是否保持在线、是否允许休眠、是否触发下电流程。", "对你来说，重点不是一次读完整份规范，而是把 NM 状态和项目现象对上：为什么诊断断了、为什么不休眠、为什么唤醒后状态不对。"],
    checkpoints: ["节点处于 Repeat Message、Normal Operation 还是 Prepare Bus Sleep", "谁在请求网络保持唤醒", "NM 状态变化是否触发 BswM/EcuM 动作", "诊断会话是否被网络状态打断"],
  },
  {
    id: "gate-driver",
    title: "门极驱动与底层 CDD",
    count: "4 份",
    files: ["CA-IS3217 datasheet", "CaiGDrv模块原理", "NsiGDrv调用关系", "芯片速查手册"],
    learn: "把芯片引脚、低电平有效故障、Desat、UVLO、RDY/FLT 和 CDD 采集逻辑连成一张硬件到软件的图。",
    use: "遇到驱动故障报码时，先确认物理引脚电平，再看 IoHwAb、CDD 聚合故障字、RTE 接口和诊断上报。",
    firstRead: "先读芯片速查手册建立引脚和故障含义，再看 CaiGDrv/NsiGDrv 的调用关系。",
    detail: ["这组资料连接硬件和软件：芯片的 FLT/RDY/DESAT/UVLO 不是停在 datasheet 上，最终要被 IoHwAb/CDD 读成软件故障字。", "学习时要特别注意低电平有效、取反逻辑、故障锁存和复位条件，这些地方最容易导致“电平看着对，软件报码不对”。"],
    checkpoints: ["故障引脚是否低电平有效", "CDD 是否对电平取反", "故障字每一位代表哪个芯片/桥臂", "诊断报码是否区分 Desat 和 UVLO"],
  },
  {
    id: "eight-d",
    title: "8D 故障报告与复盘",
    count: "2 份",
    files: ["8D故障报告整理", "Kimi 8D结论先行包"],
    learn: "把排查过程整理成结论先行的内部报告：问题是什么、影响多大、根因是什么、已做什么、还差什么。",
    use: "每次项目问题结束后，用 D1-D8 做复盘，把工程经验反哺到资料库和下一次排查清单。",
    firstRead: "先看 8D 故障报告整理里的结论先行结构，再把最近一次项目问题套进去。",
    detail: ["这组资料不是技术模块，但它能把你的项目经验变成可复用资产。", "报告不要从背景铺开，而要先说结论：问题是什么、当前影响、根因判断、已经采取的措施、下一步计划。", "D1-D8 适合做支撑结构，不适合让读者在里面找重点。"],
    checkpoints: ["是否先给结论", "问题现象是否可复现", "根因和证据是否对应", "纠正措施和预防措施是否分清"],
  },
  {
    id: "system-context",
    title: "系统理解扩展",
    count: "3 份",
    files: ["P0/P4混动构型", "聊天记录", "项目资料摘要"],
    learn: "补齐电机控制器所在系统位置，知道软件模块为什么服务于整车、电驱和诊断目标。",
    use: "当单个模块学不动时，回到系统层看：这个信号从哪里来、影响谁、失败后车辆会发生什么。",
    firstRead: "先读 P0/P4 混动构型，知道电机控制器在系统里的位置，再回看具体模块。",
    detail: ["这组资料帮你从模块视角跳到系统视角。", "当 NvM、DTC、门极驱动这些知识点变成一堆孤立名词时，系统资料能回答：为什么这个数据要保存、为什么这个故障要上传、为什么这个驱动状态会影响整车。"],
    checkpoints: ["当前模块服务哪个系统目标", "信号从哪里来、到哪里去", "故障会影响驾驶、充电还是诊断", "哪些信息需要掉电保持"],
  },
];

const studyQueue: StudyQueueItem[] = [
  { day: "第 1 站", title: "DTC 主动上传主链路", detail: "从 DiagAgent / UploadDtc 到 Dem、通信发送和失败记录，先画一张调用链图。" },
  { day: "第 2 站", title: "EOL DID 与 NVM-backed DID", detail: "选一个 DID，追它的诊断服务、数据来源、NvM Block 和上下电读写。" },
  { day: "第 3 站", title: "NvM/Fee/Fls 下电存储", detail: "用 ReadAll/WriteAll 资料建立 ISOLAR 配置检查表。" },
  { day: "第 4 站", title: "CAN 网络管理联动", detail: "把 NM 状态机和诊断在线、下电保存、EcuM/BswM 动作放到一张图里。" },
  { day: "第 5 站", title: "门极驱动故障上报", detail: "从芯片 FLT/RDY 引脚追到 CDD、RTE、DTC，让硬件故障能落到软件证据。" },
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

export default function Home() {
  const [active, setActive] = useState<FocusKey>("daily");
  const [selectedId, setSelectedId] = useState("trap-stack");
  const [selectedResourceId, setSelectedResourceId] = useState("dtc-upload");
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<CaptureNote[]>(seedNotes);
  const [notesStatus, setNotesStatus] = useState("正在连接云端经验库...");
  const [form, setForm] = useState({
    title: "",
    source: "",
    tag: "项目经验",
    symptom: "",
    reason: "",
    action: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const response = await fetch("/api/notes", { cache: "no-store" });
        const payload = (await response.json()) as {
          notes?: CaptureNote[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "云端经验库读取失败");
        }

        if (cancelled) return;

        const cloudNotes = (payload.notes ?? []).map((note) => ({
          ...note,
          id: String(note.id),
          createdAt: note.createdAt?.slice(0, 10) || "云端记录",
        }));

        const missingSeeds = seedNotes.filter(
          (seed) => !cloudNotes.some((note) => note.title === seed.title),
        );

        setNotes([...cloudNotes, ...missingSeeds]);
        setNotesStatus(
          cloudNotes.length
            ? `已连接云端经验库：${cloudNotes.length} 条云端记录`
            : "已连接云端经验库：当前还没有你新增的云端记录",
        );
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "云端经验库暂时不可用";
        setNotes(seedNotes);
        setNotesStatus(`云端经验库暂时不可用：${message}`);
      }
    }

    loadNotes();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCards = useMemo(() => {
    const text = query.trim().toLowerCase();
    return knowledgeCards.filter((card) => {
      const matchesTab = active === "daily" || card.accent === active;
      const blob = `${card.title} ${card.area} ${card.summary} ${card.scenario}`.toLowerCase();
      return matchesTab && (!text || blob.includes(text));
    });
  }, [active, query]);

  const filteredResources = useMemo(() => {
    const text = query.trim().toLowerCase();
    return resourcePacks.filter((pack) => {
      const blob = `${pack.title} ${pack.files.join(" ")} ${pack.learn} ${pack.use}`.toLowerCase();
      return !text || blob.includes(text);
    });
  }, [query]);

  const filteredNotes = useMemo(() => {
    const text = query.trim().toLowerCase();
    return notes.filter((note) => {
      const blob = `${note.title} ${note.source} ${note.tag} ${note.symptom} ${note.reason} ${note.action}`.toLowerCase();
      return !text || blob.includes(text);
    });
  }, [notes, query]);

  const selectedCard =
    knowledgeCards.find((card) => card.id === selectedId) ?? knowledgeCards[0];
  const selectedResource =
    resourcePacks.find((pack) => pack.id === selectedResourceId) ?? resourcePacks[0];

  function selectTab(key: FocusKey) {
    setActive(key);
    const firstMatch = knowledgeCards.find((card) => card.accent === key);
    if (firstMatch) setSelectedId(firstMatch.id);
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) return;

    setNotesStatus("正在保存到云端经验库...");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as {
        note?: CaptureNote;
        error?: string;
      };

      if (!response.ok || !payload.note) {
        throw new Error(payload.error || "保存失败");
      }

      const nextNote: CaptureNote = {
        ...payload.note,
        id: String(payload.note.id),
        createdAt: payload.note.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      };

      setNotes((current) => [
        nextNote,
        ...current.filter((note) => note.title !== nextNote.title),
      ]);
      setForm({
        title: "",
        source: "",
        tag: "项目经验",
        symptom: "",
        reason: "",
        action: "",
      });
      setNotesStatus("已保存到云端经验库，换设备打开也能看到。");
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      setNotesStatus(`保存失败：${message}`);
    }
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

        <section id="resources" className="resource-section" aria-label="新导入资料包">
          <div className="section-heading">
            <div>
              <span className="section-kicker">新导入资料包</span>
              <h2>把下载资料整理成 7 条学习主线</h2>
            </div>
          </div>
          <div className="import-summary">
            <article className="summary-card">
              <span className="section-kicker">本次整理</span>
              <strong>31 份资料</strong>
              <p>
                已按工程用途归档为 DTC 主动上传、UDS/EOL DID、NvM/Fee/Fls、CAN 网络管理、门极驱动、8D 复盘和系统扩展。网页只沉淀学习索引，不公开原始项目资料。
              </p>
            </article>
            <article className="summary-card summary-card--privacy">
              <span className="section-kicker">使用原则</span>
              <ul>
                <li>先用文件建立知识地图，再挑一条线深挖。</li>
                <li>每类资料都绑定一个工程问题，避免只收藏不消化。</li>
                <li>涉及项目代码、需求和报告的内容只做脱敏摘要。</li>
              </ul>
            </article>
          </div>
          <div className="resource-grid">
            {filteredResources.map((pack) => (
              <article key={pack.title} className="resource-card">
                <header>
                  <h3>{pack.title}</h3>
                  <em>{pack.count}</em>
                </header>
                <div className="file-list">
                  {pack.files.map((file) => (
                    <span key={file}>{file}</span>
                  ))}
                </div>
                <dl>
                  <div>
                    <dt>先学什么</dt>
                    <dd>{pack.learn}</dd>
                  </div>
                  <div>
                    <dt>项目里怎么用</dt>
                    <dd>{pack.use}</dd>
                  </div>
                </dl>
                <button
                  className="read-button"
                  type="button"
                  onClick={() => setSelectedResourceId(pack.id)}
                >
                  查看资料详情
                </button>
              </article>
            ))}
          </div>
          <article className="resource-reader">
            <aside>
              <span className="section-kicker">资料详情</span>
              <h2>{selectedResource.title}</h2>
              <p>{selectedResource.firstRead}</p>
            </aside>
            <div>
              <section>
                <h3>包含资料</h3>
                <div className="file-list file-list--reader">
                  {selectedResource.files.map((file) => (
                    <span key={file}>{file}</span>
                  ))}
                </div>
              </section>
              <section>
                <h3>怎么看</h3>
                <ol>
                  {selectedResource.detail.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>排查检查点</h3>
                <ul>
                  {selectedResource.checkpoints.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </article>
        </section>

        <section id="queue" className="queue-section" aria-label="下一步学习队列">
          <div className="section-heading">
            <div>
              <span className="section-kicker">下一步学习队列</span>
              <h2>从资料变成能力的 5 个入口</h2>
            </div>
          </div>
          <div className="study-queue">
            {studyQueue.map((item) => (
              <article key={item.day} className="queue-card">
                <span>{item.day}</span>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
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
              录入时不要求一次写完美。先把“现象、可能原因、下一步动作”留下，保存后会进入云端经验库，后面再扩展成学习文章或排查卡。
            </p>
            <div className="cloud-status">{notesStatus}</div>
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
