import { state } from './store.js';

/* ---------------- i18n ---------------- */
export const I18N = {
  en: {
    'nav.dashboard':'Dashboard','nav.clients':'Clients','nav.orders':'Orders','nav.calendar':'Calendar','nav.formulas':'Formula Admin',
    'nav.signout':'Sign out',

    'calendar.title':'Calendar','calendar.desc':'Key dates across all orders — order dates and required completion dates.',
    'calendar.today':'Today','calendar.legendOrder':'Order date','calendar.legendDue':'Required completion',
    'calendar.upcoming':'Upcoming Required Completion Dates','calendar.noEvents':'Nothing due. Nice and clear.',
    'app.title':'Home Fortune Operations',
    'search.placeholder':'Search clients, phone, email, order #...','search.noMatches':'No matches.',

    'dash.title':'Dashboard','dash.desc':'Overview of current work across all orders.',
    'dash.overdue':'Overdue Orders','dash.recent':'Recent Activity','dash.noOverdue':'No overdue orders. Nice work.',
    'dash.missingInfo':'order(s) have missing information (no measurement employee assigned or no items entered).',
    'dash.footnote':'Calculation results use SAMPLE placeholder formulas and pricing, not verified company production rules — see Formula Admin.',
    'stat.newInquiry':'New Inquiry','stat.measurementRequired':'Measurement Required','stat.quoteInProgress':'Quote In Progress',
    'stat.customerApproval':'Customer Approval Required','stat.readyForFactory':'Ready For Factory','stat.inProduction':'In Production',
    'stat.installScheduled':'Installation Scheduled','stat.overdue':'Overdue',

    'clients.title':'Clients','clients.desc':'Client profiles, contact details, and history.',
    'clients.new':'+ New Client','clients.search':'Search by name, phone, email, address, or client #',
    'th.clientNo':'Client #','th.name':'Name','th.phone':'Phone','th.email':'Email','th.projectAddress':'Project Address',
    'th.language':'Language','th.orders':'Orders','th.orderNo':'Order #','th.client':'Client','th.status':'Status',
    'th.orderDate':'Order Date','th.dueDate':'Due Date','th.due':'Due','th.salesperson':'Salesperson','th.items':'Items',
    'th.component':'Component','th.widthMm':'Width (mm)','th.heightMm':'Height (mm)','th.qtyPerUnit':'Qty/unit',
    'th.totalQty':'Total Qty','th.product':'Product','th.versionCol':'Version','th.widthRange':'Width range','th.heightRange':'Height range',
    'th.lastChanged':'Last changed',

    'client.contact':'Contact','client.notes':'Notes','client.files':'Files','client.noNotes':'No notes.','client.noFiles':'File uploads are not yet enabled.',
    'client.phone':'Phone','client.email':'Email','client.company':'Company','client.prefLang':'Preferred language',
    'client.billingAddress':'Billing address','client.projectAddress':'Project address','client.referral':'Referral source',
    'client.owner':'Employee responsible','client.created':'Created','client.history':'Quote & Order History',
    'client.newOrderFor':'+ New Order for this Client','client.noOrdersYet':'No orders yet.',
    'form.fullName':'Full name *','form.companyOpt':'Company (if applicable)','form.phone1':'Primary phone *','form.phone2':'Secondary phone',
    'form.email':'Email','form.prefLang':'Preferred language','form.referral':'Referral source','form.owner':'Employee responsible',
    'form.billingAddress':'Billing address','form.projectAddress':'Installation / project address','form.notes':'General notes',
    'dup.warning':'A client with this phone or email already exists',
    'dup.check':'Check before creating a new profile.','client.new':'New Client','client.edit':'Edit Client',

    'orders.title':'Orders','orders.desc':'Every project and order, from inquiry to installation.','orders.new':'+ New Order',
    'filter.allStatuses':'All statuses','filter.employee':'Filter by employee','filter.customer':'Filter by customer','filter.allProducts':'All product types',
    'order.new':'New Order','order.edit':'Edit Order','form.client':'Client *','form.status':'Status','form.orderDate':'Order date',
    'form.dueDate':'Required completion date','form.salesperson':'Salesperson','form.measEmployee':'Measurement employee',
    'form.officeEmployee':'Office employee','form.deposit':'Deposit ($)','form.installAddr':'Installation address',
    'form.internalNotes':'Internal notes','form.factoryNotes':'Factory notes','form.installNotes':'Installation notes',
    'order.orderDate':'Order date','order.requiredCompletion':'Required completion','order.assigned':'Assigned',
    'order.sales':'Sales','order.measure':'Measure','order.office':'Office','order.windowsProducts':'Windows & Products',
    'order.addItem':'+ Add Item','order.noItemsYet':'No items yet.','order.factorySheetBtn':'🖨 Factory Sheet',
    'order.back':'← Back','order.tabNotes':'Notes','order.tabHistory':'History','order.depositLabel':'Deposit',
    'order.noPaymentNotes':'no payment notes','order.internalNotesLbl':'Internal notes','order.factoryNotesLbl':'Factory notes',
    'order.installNotesLbl':'Installation notes',

    'item.opening':'Opening','item.glass':'Glass','item.color':'Colour','item.screen':'Screen','item.hardware':'Hardware',
    'item.room':'Room','item.edit':'Edit','item.duplicate':'Duplicate','item.calculate':'Calculate','item.recalculate':'Recalculate',
    'item.approve':'Approve','item.reopenAdmin':'Reopen (admin)','item.notCalculated':'Not calculated',
    'item.draftNotCalc':'Draft — not yet calculated','item.calcAwaiting':'Calculated — awaiting approval','item.approvedBy':'Approved by',
    'item.qty':'qty','item.addWindow':'Add Window / Product','item.editItem':'Edit Item',
    'form.category':'Product category *','form.width':'Width (mm) *','form.height':'Height (mm) *','form.qty':'Quantity *',
    'form.openingStyle':'Opening style','form.frameSystem':'Frame / profile system','form.glassType':'Glass type',
    'form.glassThickness':'Glass thickness / glazing','form.colour':'Colour','form.screenType':'Screen type','form.hardware':'Hardware',
    'form.grid':'Grid / grille options','form.room':'Room / location','form.specialOptions':'Special manufacturing options',
    'form.installReq':'Installation requirements','form.notes':'Notes',

    'calc.formulaVersion':'Formula version','calc.calculatedBy':'calculated by','calc.on':'on',
    'calc.sampleNote':'Sample/placeholder formula — not yet verified against company manufacturing rules.',
    'calc.error.custom':'Custom shapes require individual engineering review. No verified formula is on file — do not guess. Route to admin for manual calculation.',
    'calc.error.inactive':'Formula for this product type is inactive or missing. Contact an administrator.',
    'calc.error.badnum':'Width and height must be positive numbers.',
    'calc.warn.widthRange':'Width {w}mm is outside the approved range ({min}–{max}mm) for this product.',
    'calc.warn.heightRange':'Height {h}mm is outside the approved range ({min}–{max}mm) for this product.',
    'calc.overdueTitle':'Overdue',

    'factory.title':'Factory Production Sheet','factory.docLang':'Document language','factory.langEn':'English','factory.langZh':'中文',
    'factory.langBoth':'English + 中文','factory.info':'Sheet will include all items with an approved calculation. Items still in draft or awaiting approval will be flagged and excluded.',
    'factory.generatePreview':'Generate & Preview','factory.markSent':'Mark as Sent to Factory',

    'formulas.title':'Formula Admin','formulas.desc':'Deterministic calculation rules by product type. Admin-only.',
    'formulas.restricted':'Formula management is restricted to Administrators.',
    'formulas.warnBanner':'⚠ All values below are SAMPLE placeholder deductions. They must be replaced with Home Fortune’s verified manufacturing formulas, and tested against manually-confirmed sample orders, before any real production use.',
    'formulas.active':'Active','formulas.inactive':'Inactive','formulas.edit':'Edit Formula','formulas.version':'Version',
    'formulas.autoIncrement':'(auto-increments on save)','formulas.minWidth':'Min width (mm)','formulas.maxWidth':'Max width (mm)',
    'formulas.minHeight':'Min height (mm)','formulas.maxHeight':'Max height (mm)','formulas.deductions':'Deductions (mm)',
    'formulas.noDeductions':'No deduction fields — engineering review required for this product type.',
    'formulas.testFormula':'Test this formula (uses values above, unsaved)','formulas.testWidth':'Test width (mm)',
    'formulas.testHeight':'Test height (mm)','formulas.testQty':'Test qty','formulas.runTest':'Run Test',
    'formulas.versionHistory':'Version history','formulas.none':'none yet','formulas.savePublish':'Save & Publish',
    'formulas.by':'by','formulas.on':'on',

    'common.save':'Save','common.cancel':'Cancel','common.edit':'Edit','common.view':'View','common.delete':'Delete',
    'common.name':'Full name','common.phone':'Phone','common.email':'Email','common.address':'Address',
    'common.status':'Status','common.notes':'Notes','common.close':'Close','common.approve':'Approve','common.back':'Back',
    'common.print':'Print / Save as PDF','common.calculate':'Calculate','common.confirm':'Confirm','common.na':'—',
    'common.loading':'Loading…',

    'alert.fullNameRequired':'Full name is required.','alert.selectClient':'Select a client.',
    'alert.widthHeightRequired':'Width and height are required and must be positive numbers.',
    'confirm.reopen':'Reopen this approved calculation for editing? This should only be done by an authorized administrator.',

    'act.createClient':'Created client {name} ({no})','act.updateClient':'Updated client {name}',
    'act.createOrder':'Created order {no} for {name}','act.updateOrder':'Updated order {no}',
    'act.orderCreated':'Order created','act.orderUpdated':'Order details updated','act.statusChanged':'Status changed to {status}',
    'act.addedItem':'Added {item}','act.itemUpdated':'{item} updated',
    'act.itemMeasurementsChanged':'{item} measurements changed — calculation reset, recalculation required',
    'act.duplicatedItem':'Duplicated {src} as {item}','act.calculated':'Calculated {item}',
    'act.approvedCalc':'Approved calculation for {item}','act.reopenedCalc':'Reopened approved calculation for {item} (admin)',
    'act.generatedFactorySheet':'Generated factory sheet v{v} ({lang})','act.sentToFactory':'Marked as sent to factory',
    'act.updatedFormula':'Updated formula for {type} to v{v}',

    'notApprovedExcluded':'item(s) excluded — not yet approved',
    'fs.footnote':'This document uses sample placeholder calculation formulas — not for actual production use until formulas are verified.',

    'quote.title':'Client Quote','quote.addItemsFirst':'Add windows/products above to generate a quote.',
    'quote.basePrice':'Base price','quote.sizeArea':'Size {w}×{h}mm ({area} sq ft)','quote.glassUpgrade':'Glass upgrade',
    'quote.colourUpgrade':'Colour upgrade','quote.screenUpgrade':'Screen upgrade','quote.hardwareUpgrade':'Hardware upgrade',
    'quote.gridSurcharge':'Grid / grille surcharge','quote.estimatedPrice':'Estimated price','quote.perUnit':'per unit',
    'quote.unitPrice':'Unit Price','quote.lineTotal':'Line Total','quote.subtotal':'Subtotal','quote.discount':'Discount (%)',
    'quote.tax':'Tax (%)','quote.grandTotal':'Grand Total','quote.sendToClient':'Send Quote to Client',
    'quote.recordApproval':'Record Client Approval','quote.approvedByLabel':'Approved by (client name, or "via phone/email")',
    'quote.approvalNoteLabel':'Note (optional)','quote.confirmApproval':'Confirm Approval','quote.reopenQuote':'Reopen Quote (admin)',
    'quote.statusDraft':'Draft — not yet sent','quote.statusSent':'Sent — awaiting client approval','quote.statusApproved':'Approved by client',
    'quote.awaitingApproval':'Awaiting client quote approval','quote.outOfDate':'Quote is out of date — item details changed since it was sent/approved. Regenerate and re-approve the quote before material calculations can proceed.',
    'quote.error.custom':'Custom shapes require a manual quote from sales — no verified pricing formula on file.',
    'quote.error.inactive':'Pricing for this product type is inactive or missing. Contact an administrator.',
    'quote.excludedItems':'item(s) need a manual quote and are excluded from the auto-total','quote.manualQuoteRequired':'Manual quote required',
    'quote.sentOn':'Sent','quote.approvedOn':'Approved','quote.by':'by','quote.discountPctLabel':'Discount %','quote.taxPctLabel':'Tax %',
    'quote.sampleNote':'Pricing shown uses SAMPLE placeholder rates — not real Home Fortune pricing yet. See Formula Admin.',
    'quote.manualOverrideLabel':'Override final price ($, optional)','quote.manualOverrideNote':'Manually set — replaces the calculated total below (which was ${calc}).',
    'quote.reopenConfirm':'Reopen this approved quote for editing? Any approved material calculations on this order will be reset to draft and will need to be recalculated once the quote is re-approved. This should only be done by an authorized administrator.',

    'formulas.tabMaterials':'Material Formulas','formulas.tabPricing':'Quote Pricing',
    'th.basePrice':'Base Price','th.pricePerSqFt':'Price / sq ft',
    'pricing.editProduct':'Edit Pricing','pricing.basePriceLbl':'Base price ($)','pricing.perSqFtLbl':'Price per sq ft ($)',
    'pricing.testTitle':'Test base + size price (feature modifiers not included in this preview)',
    'pricing.testResultLabel':'Base + size price','pricing.editModifiers':'Edit Feature Modifiers (shared across all products)',
    'pricing.modifiersDesc':'These add-on amounts apply on top of each product’s base + size price, based on the options selected on each window/product.',
    'pricing.glassSection':'Glass Type Upgrades ($)','pricing.colorSection':'Colour Upgrades ($)','pricing.screenSection':'Screen Upgrades ($)',
    'pricing.hardwareSection':'Hardware Upgrades ($)','pricing.gridSurchargeLbl':'Grid / grille surcharge ($, flat — applied whenever a grid option other than None is selected)',
    'pricing.warnBanner':'⚠ All prices below are SAMPLE placeholder rates. They must be replaced with Home Fortune’s real, approved price list before any client-facing quote is used for real business.',
    'pricing.editModifiersBtn':'Edit Modifiers','pricing.lastChanged':'Last changed',

    'act.sentQuote':'Sent quote to client — total ${total}','act.approvedQuote':'Quote approved by {by}','act.reopenedQuote':'Reopened quote (admin) — material calculations reset',
    'act.updatedPricingProduct':'Updated pricing for {type} to v{v}','act.updatedPricingModifiers':'Updated feature pricing modifiers to v{v}',

    'auth.invalidCredentials':'Incorrect email or password.','auth.noProfile':'No employee profile is set up for this login yet. Ask an administrator to add you in Supabase, then create your profiles row.',
    'auth.inactive':'This account has been deactivated. Contact an administrator.','auth.genericError':'Sign-in failed: {msg}',
  },
  zh: {
    'nav.dashboard':'仪表盘','nav.clients':'客户','nav.orders':'订单','nav.calendar':'日历','nav.formulas':'公式管理',
    'nav.signout':'退出登录',

    'calendar.title':'日历','calendar.desc':'所有订单的关键日期 — 订单日期与要求完工日期。',
    'calendar.today':'今天','calendar.legendOrder':'订单日期','calendar.legendDue':'要求完工日期',
    'calendar.upcoming':'即将到来的要求完工日期','calendar.noEvents':'暂无到期项目，一切正常。',
    'app.title':'家福门窗运营系统',
    'search.placeholder':'搜索客户、电话、邮箱、订单号...','search.noMatches':'没有匹配结果。',

    'dash.title':'仪表盘','dash.desc':'查看所有订单的当前工作概览。',
    'dash.overdue':'逾期订单','dash.recent':'最近活动','dash.noOverdue':'没有逾期订单，做得好。',
    'dash.missingInfo':'个订单信息不完整（未指派测量员或未录入项目）。',
    'dash.footnote':'计算结果使用占位示例公式与价格，并非已核实的公司生产规则 — 详见公式管理。',
    'stat.newInquiry':'新询价','stat.measurementRequired':'需要测量','stat.quoteInProgress':'报价中',
    'stat.customerApproval':'需要客户确认','stat.readyForFactory':'待送工厂','stat.inProduction':'生产中',
    'stat.installScheduled':'已安排安装','stat.overdue':'逾期',

    'clients.title':'客户','clients.desc':'客户档案、联系方式与历史记录。',
    'clients.new':'+ 新建客户','clients.search':'按姓名、电话、邮箱、地址或客户编号搜索',
    'th.clientNo':'客户编号','th.name':'姓名','th.phone':'电话','th.email':'邮箱','th.projectAddress':'项目地址',
    'th.language':'语言','th.orders':'订单数','th.orderNo':'订单号','th.client':'客户','th.status':'状态',
    'th.orderDate':'订单日期','th.dueDate':'要求完工日期','th.due':'到期日','th.salesperson':'销售员','th.items':'项目数',
    'th.component':'部件','th.widthMm':'宽度(mm)','th.heightMm':'高度(mm)','th.qtyPerUnit':'每件数量',
    'th.totalQty':'总数量','th.product':'产品','th.versionCol':'版本','th.widthRange':'宽度范围','th.heightRange':'高度范围',
    'th.lastChanged':'最后修改',

    'client.contact':'联系方式','client.notes':'备注','client.files':'文件','client.noNotes':'暂无备注。','client.noFiles':'文件上传功能尚未启用。',
    'client.phone':'电话','client.email':'邮箱','client.company':'公司','client.prefLang':'偏好语言',
    'client.billingAddress':'账单地址','client.projectAddress':'项目地址','client.referral':'推荐来源',
    'client.owner':'负责员工','client.created':'创建时间','client.history':'报价与订单历史',
    'client.newOrderFor':'+ 为该客户新建订单','client.noOrdersYet':'暂无订单。',
    'form.fullName':'姓名 *','form.companyOpt':'公司名称（如适用）','form.phone1':'主要电话 *','form.phone2':'备用电话',
    'form.email':'邮箱','form.prefLang':'偏好语言','form.referral':'推荐来源','form.owner':'负责员工',
    'form.billingAddress':'账单地址','form.projectAddress':'安装/项目地址','form.notes':'一般备注',
    'dup.warning':'已存在使用相同电话或邮箱的客户',
    'dup.check':'请在创建新档案前进行核实。','client.new':'新建客户','client.edit':'编辑客户',

    'orders.title':'订单','orders.desc':'从询价到安装的每一个项目与订单。','orders.new':'+ 新建订单',
    'filter.allStatuses':'所有状态','filter.employee':'按员工筛选','filter.customer':'按客户筛选','filter.allProducts':'所有产品类型',
    'order.new':'新建订单','order.edit':'编辑订单','form.client':'客户 *','form.status':'状态','form.orderDate':'订单日期',
    'form.dueDate':'要求完工日期','form.salesperson':'销售员','form.measEmployee':'测量员',
    'form.officeEmployee':'办公室员工','form.deposit':'订金 ($)','form.installAddr':'安装地址',
    'form.internalNotes':'内部备注','form.factoryNotes':'工厂备注','form.installNotes':'安装备注',
    'order.orderDate':'订单日期','order.requiredCompletion':'要求完工日期','order.assigned':'指派人员',
    'order.sales':'销售','order.measure':'测量','order.office':'办公室','order.windowsProducts':'窗户与产品',
    'order.addItem':'+ 添加项目','order.noItemsYet':'暂无项目。','order.factorySheetBtn':'🖨 工厂生产单',
    'order.back':'← 返回','order.tabNotes':'备注','order.tabHistory':'历史记录','order.depositLabel':'订金',
    'order.noPaymentNotes':'无付款备注','order.internalNotesLbl':'内部备注','order.factoryNotesLbl':'工厂备注',
    'order.installNotesLbl':'安装备注',

    'item.opening':'开启方式','item.glass':'玻璃','item.color':'颜色','item.screen':'纱窗','item.hardware':'五金',
    'item.room':'房间','item.edit':'编辑','item.duplicate':'复制','item.calculate':'计算','item.recalculate':'重新计算',
    'item.approve':'批准','item.reopenAdmin':'重新打开（管理员）','item.notCalculated':'尚未计算',
    'item.draftNotCalc':'草稿 — 尚未计算','item.calcAwaiting':'已计算 — 等待批准','item.approvedBy':'批准人',
    'item.qty':'数量','item.addWindow':'添加窗户/产品','item.editItem':'编辑项目',
    'form.category':'产品类别 *','form.width':'宽度(mm) *','form.height':'高度(mm) *','form.qty':'数量 *',
    'form.openingStyle':'开启方式','form.frameSystem':'框架/型材系统','form.glassType':'玻璃类型',
    'form.glassThickness':'玻璃厚度/中空规格','form.colour':'颜色','form.screenType':'纱窗类型','form.hardware':'五金件',
    'form.grid':'格条/网格选项','form.room':'房间/位置','form.specialOptions':'特殊制造选项',
    'form.installReq':'安装要求','form.notes':'备注',

    'calc.formulaVersion':'公式版本','calc.calculatedBy':'计算人','calc.on':'于',
    'calc.sampleNote':'示例/占位公式 — 尚未依据公司生产规则核实。',
    'calc.error.custom':'异形窗需要单独的工程审核。系统中没有已核实的公式 — 请勿猜测，请转交管理员手动计算。',
    'calc.error.inactive':'该产品类型的公式未启用或缺失，请联系管理员。',
    'calc.error.badnum':'宽度和高度必须为正数。',
    'calc.warn.widthRange':'宽度 {w}mm 超出该产品的批准范围（{min}–{max}mm）。',
    'calc.warn.heightRange':'高度 {h}mm 超出该产品的批准范围（{min}–{max}mm）。',
    'calc.overdueTitle':'逾期',

    'factory.title':'工厂生产单','factory.docLang':'文档语言','factory.langEn':'English','factory.langZh':'中文',
    'factory.langBoth':'English + 中文','factory.info':'生产单将包含所有已批准计算的项目。仍为草稿或待批准的项目将被标记并排除在外。',
    'factory.generatePreview':'生成并预览','factory.markSent':'标记为已送工厂',

    'formulas.title':'公式管理','formulas.desc':'按产品类型设定的确定性计算规则（仅管理员）。',
    'formulas.restricted':'公式管理仅限管理员使用。',
    'formulas.warnBanner':'⚠ 以下所有数值均为示例占位扣减值。在投入任何实际生产使用前，必须替换为家福门窗已核实的生产制造公式，并与人工确认过的样本订单进行测试比对。',
    'formulas.active':'启用','formulas.inactive':'停用','formulas.edit':'编辑公式','formulas.version':'版本',
    'formulas.autoIncrement':'（保存时自动递增）','formulas.minWidth':'最小宽度(mm)','formulas.maxWidth':'最大宽度(mm)',
    'formulas.minHeight':'最小高度(mm)','formulas.maxHeight':'最大高度(mm)','formulas.deductions':'扣减值(mm)',
    'formulas.noDeductions':'无扣减字段 — 该产品类型需要工程审核。',
    'formulas.testFormula':'测试该公式（使用上方数值，未保存）','formulas.testWidth':'测试宽度(mm)',
    'formulas.testHeight':'测试高度(mm)','formulas.testQty':'测试数量','formulas.runTest':'运行测试',
    'formulas.versionHistory':'版本历史','formulas.none':'暂无','formulas.savePublish':'保存并发布',
    'formulas.by':'由','formulas.on':'于',

    'common.save':'保存','common.cancel':'取消','common.edit':'编辑','common.view':'查看','common.delete':'删除',
    'common.name':'姓名','common.phone':'电话','common.email':'邮箱','common.address':'地址',
    'common.status':'状态','common.notes':'备注','common.close':'关闭','common.approve':'批准','common.back':'返回',
    'common.print':'打印 / 保存为PDF','common.calculate':'计算','common.confirm':'确认','common.na':'—',
    'common.loading':'加载中…',

    'alert.fullNameRequired':'姓名为必填项。','alert.selectClient':'请选择一个客户。',
    'alert.widthHeightRequired':'宽度和高度为必填项，且必须为正数。',
    'confirm.reopen':'确定要重新打开这个已批准的计算以进行编辑吗？此操作应仅由授权管理员执行。',

    'act.createClient':'已创建客户 {name}（{no}）','act.updateClient':'已更新客户 {name}',
    'act.createOrder':'已为 {name} 创建订单 {no}','act.updateOrder':'已更新订单 {no}',
    'act.orderCreated':'订单已创建','act.orderUpdated':'订单详情已更新','act.statusChanged':'状态已更改为 {status}',
    'act.addedItem':'已添加 {item}','act.itemUpdated':'{item} 已更新',
    'act.itemMeasurementsChanged':'{item} 尺寸已更改 — 计算已重置，需要重新计算',
    'act.duplicatedItem':'已将 {src} 复制为 {item}','act.calculated':'已计算 {item}',
    'act.approvedCalc':'已批准 {item} 的计算','act.reopenedCalc':'已重新打开 {item} 的已批准计算（管理员）',
    'act.generatedFactorySheet':'已生成工厂生产单第 {v} 版（{lang}）','act.sentToFactory':'已标记为已送工厂',
    'act.updatedFormula':'已将 {type} 的公式更新至第 {v} 版',

    'notApprovedExcluded':'个项目已排除 — 尚未批准',
    'fs.footnote':'本文档使用示例占位计算公式 — 在公式核实之前不得用于实际生产。',

    'quote.title':'客户报价','quote.addItemsFirst':'请先在上方添加窗户/产品，然后即可生成报价。',
    'quote.basePrice':'基础价格','quote.sizeArea':'尺寸 {w}×{h}mm（{area} 平方英尺）','quote.glassUpgrade':'玻璃升级',
    'quote.colourUpgrade':'颜色升级','quote.screenUpgrade':'纱窗升级','quote.hardwareUpgrade':'五金升级',
    'quote.gridSurcharge':'格条/网格附加费','quote.estimatedPrice':'预估价格','quote.perUnit':'每件',
    'quote.unitPrice':'单价','quote.lineTotal':'小计','quote.subtotal':'小计总额','quote.discount':'折扣 (%)',
    'quote.tax':'税率 (%)','quote.grandTotal':'总计','quote.sendToClient':'将报价发送给客户',
    'quote.recordApproval':'记录客户批准','quote.approvedByLabel':'批准人（客户姓名，或"通过电话/邮件"）',
    'quote.approvalNoteLabel':'备注（可选）','quote.confirmApproval':'确认批准','quote.reopenQuote':'重新打开报价（管理员）',
    'quote.statusDraft':'草稿 — 尚未发送','quote.statusSent':'已发送 — 等待客户批准','quote.statusApproved':'客户已批准',
    'quote.awaitingApproval':'等待客户批准报价','quote.outOfDate':'报价已过期 — 项目详情在发送/批准后发生了变化。请在进行物料计算之前重新生成并重新批准报价。',
    'quote.error.custom':'异形窗需要销售人员手动报价 — 系统中没有已核实的定价公式。',
    'quote.error.inactive':'该产品类型的定价未启用或缺失，请联系管理员。',
    'quote.excludedItems':'个项目需要手动报价，已从自动总额中排除','quote.manualQuoteRequired':'需要手动报价',
    'quote.sentOn':'发送时间','quote.approvedOn':'批准时间','quote.by':'由','quote.discountPctLabel':'折扣 %','quote.taxPctLabel':'税率 %',
    'quote.sampleNote':'所示价格为示例占位费率 — 并非家福门窗的真实价格。详见公式管理。',
    'quote.manualOverrideLabel':'手动设置最终价格 ($，可选)','quote.manualOverrideNote':'已手动设置 — 将替代下方计算总额（原计算值为 ${calc}）。',
    'quote.reopenConfirm':'确定要重新打开这个已批准的报价以进行编辑吗？此订单上所有已批准的物料计算都将被重置为草稿状态，并需要在报价重新批准后重新计算。此操作应仅由授权管理员执行。',

    'formulas.tabMaterials':'物料计算公式','formulas.tabPricing':'报价定价',
    'th.basePrice':'基础价格','th.pricePerSqFt':'每平方英尺价格',
    'pricing.editProduct':'编辑定价','pricing.basePriceLbl':'基础价格 ($)','pricing.perSqFtLbl':'每平方英尺价格 ($)',
    'pricing.testTitle':'测试基础价+尺寸价格（此预览不含附加选项）',
    'pricing.testResultLabel':'基础价+尺寸价格','pricing.editModifiers':'编辑附加选项定价（所有产品共用）',
    'pricing.modifiersDesc':'这些附加金额将根据每个窗户/产品所选的选项，叠加在该产品的基础价+尺寸价格之上。',
    'pricing.glassSection':'玻璃类型升级 ($)','pricing.colorSection':'颜色升级 ($)','pricing.screenSection':'纱窗升级 ($)',
    'pricing.hardwareSection':'五金升级 ($)','pricing.gridSurchargeLbl':'格条/网格附加费（固定金额 — 当选择"无"以外的格条选项时收取）',
    'pricing.warnBanner':'⚠ 以下所有价格均为示例占位费率。在用于任何面向客户的实际报价之前，必须替换为家福门窗真实、已核准的价目表。',
    'pricing.editModifiersBtn':'编辑附加选项','pricing.lastChanged':'最后修改',

    'act.sentQuote':'已将报价发送给客户 — 总额 ${total}','act.approvedQuote':'报价已由 {by} 批准','act.reopenedQuote':'已重新打开报价（管理员）— 物料计算已重置',
    'act.updatedPricingProduct':'已将 {type} 的定价更新至第 {v} 版','act.updatedPricingModifiers':'已将附加选项定价更新至第 {v} 版',

    'auth.invalidCredentials':'邮箱或密码错误。','auth.noProfile':'该登录尚未设置员工档案，请联系管理员在 Supabase 中为您创建 profiles 记录。',
    'auth.inactive':'该账户已被停用，请联系管理员。','auth.genericError':'登录失败：{msg}',
  }
};
export function t(key){ const lang = state.lang || 'en'; return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
export function tf(key, params){ let s = t(key); Object.keys(params||{}).forEach(k=> s = s.replace('{'+k+'}', params[k])); return s; }
export function actMsg(key, params){ return tf('act.'+key, params||{}); }

/* ---------------- roles ---------------- */
export const ROLES = {
  admin:{en:'Administrator',zh:'管理员'},
  office:{en:'Office Employee',zh:'办公室员工'},
  measurement:{en:'Measurement Employee',zh:'测量员'},
  factory:{en:'Factory Employee',zh:'工厂员工'},
  readonly:{en:'Read-Only User',zh:'只读用户'}
};
export const NAV_BY_ROLE = {
  admin:['dashboard','clients','orders','calendar','formulas'],
  office:['dashboard','clients','orders','calendar'],
  measurement:['dashboard','orders','calendar'],
  factory:['dashboard','orders','calendar'],
  readonly:['dashboard','clients','orders','calendar']
};
export const NAV_ITEMS = [
  {id:'dashboard', icon:'🏠', key:'nav.dashboard'},
  {id:'clients', icon:'👤', key:'nav.clients'},
  {id:'orders', icon:'📋', key:'nav.orders'},
  {id:'calendar', icon:'📅', key:'nav.calendar'},
  {id:'formulas', icon:'🧮', key:'nav.formulas'},
];
export function canEdit(){ return state.user.role !== 'readonly'; }
export function isAdmin(){ return state.user.role === 'admin'; }

/* ---------------- product catalog (bilingual option lists) ---------------- */
export const PRODUCT_TYPES = [
  {id:'casement', en:'Casement Window', zh:'平开窗'},
  {id:'awning', en:'Awning Window', zh:'上悬窗'},
  {id:'slider', en:'Slider Window', zh:'推拉窗'},
  {id:'bay_bow', en:'Bay & Bow Window', zh:'凸窗/弓形窗'},
  {id:'patio_door', en:'Patio Door', zh:'推拉门'},
  {id:'custom_shape', en:'Custom Shape (Arch/Specialty)', zh:'异形窗（拱形/特殊）'}
];
// Stored value is always the English string (canonical data); zh is the display label only.
export const OPENING_STYLES = [
  {en:'Fixed', zh:'固定'}, {en:'Left Hand', zh:'左开'}, {en:'Right Hand', zh:'右开'}, {en:'Top Hinge', zh:'上悬'},
  {en:'2-Panel XO', zh:'两扇推拉(XO)'}, {en:'3-Panel XOX', zh:'三扇推拉(XOX)'}, {en:'Custom', zh:'定制'}
];
export const GLASS_TYPES = [
  {en:'Double Pane Clear', zh:'双层透明玻璃'}, {en:'Double Pane Low-E', zh:'双层Low-E玻璃'},
  {en:'Triple Pane Low-E', zh:'三层Low-E玻璃'}, {en:'Tempered Double Pane', zh:'双层钢化玻璃'}, {en:'Obscure/Privacy', zh:'磨砂/隐私玻璃'}
];
export const COLORS = [
  {en:'White', zh:'白色'}, {en:'Almond', zh:'杏仁色'}, {en:'Black', zh:'黑色'}, {en:'Dark Bronze', zh:'深青铜色'}, {en:'Woodgrain', zh:'木纹色'}
];
export const SCREEN_TYPES = [
  {en:'None', zh:'无'}, {en:'Standard Fiberglass', zh:'标准玻璃纤维纱网'}, {en:'Pet-Resistant', zh:'防宠物抓咬纱网'}, {en:'Retractable', zh:'可伸缩纱窗'}
];
export const HARDWARE = [
  {en:'None', zh:'无'},
  {en:'Standard Crank (Casement)', zh:'标准摇把（平开窗）'}, {en:'Standard Awning Operator', zh:'标准上悬窗操作器'},
  {en:'Sliding Latch + Lock', zh:'推拉锁扣'}, {en:'Multi-Point Lock', zh:'多点锁'}, {en:'Patio Door Handle Set', zh:'推拉门把手组'}
];
export const PREF_LANGS = [{en:'English', zh:'英语'}, {en:'Mandarin', zh:'普通话'}, {en:'Cantonese', zh:'广东话'}];
export const STATUS_ZH = {
  'New Inquiry':'新询价','Measurement Required':'需要测量','Measurements Completed':'测量已完成','Quote In Progress':'报价中',
  'Quote Sent':'报价已发送','Customer Approval Required':'需要客户确认','Deposit Received':'已收订金','Confirmed Order':'订单已确认',
  'Ready For Factory':'待送工厂','Sent To Factory':'已送工厂','In Production':'生产中','Production Completed':'生产完成',
  'Installation Scheduled':'已安排安装','Installed':'已安装','Payment Outstanding':'尾款未付','Completed':'已完成','Cancelled/On Hold':'已取消/暂停'
};
export function opt(list, val){ const o = list.find(x=>x.en===val); const lang=state.lang||'en'; return o ? (lang==='zh'?o.zh:o.en) : val; }
export function optionsHtml(list, selected){ const lang=state.lang||'en'; return list.map(o=>`<option value="${esc(o.en)}" ${o.en===selected?'selected':''}>${esc(lang==='zh'?o.zh:o.en)}</option>`).join(''); }
export function statusLabel(s){ const lang=state.lang||'en'; return lang==='zh' ? (STATUS_ZH[s]||s) : s; }
export function pname(p){ const lang=state.lang||'en'; return lang==='zh' ? p.zh : p.en; }
export function productLabel(catId){ const p = PRODUCT_TYPES.find(x=>x.id===catId); return p ? pname(p) : catId; }
export function opt2en(list,val){ const o=list.find(x=>x.en===val); return o?o.en:val; }
export function opt2zh(list,val){ const o=list.find(x=>x.en===val); return o?o.zh:val; }

/* ---------------- generic utils ---------------- */
export function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function fmtDate(iso){ if(!iso) return t('common.na'); const d=new Date(iso); return d.toLocaleDateString('en-CA'); }
export function fmtDateTime(iso){ if(!iso) return t('common.na'); const d=new Date(iso); return d.toLocaleString('en-CA',{hour12:false}); }
