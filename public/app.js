const form = document.querySelector("#feedForm");
const feedList = document.querySelector("#feedList");
const previewOutput = document.querySelector("#previewOutput");
const previewMeta = document.querySelector("#previewMeta");
const activeFeedLabel = document.querySelector("#activeFeedLabel");
const message = document.querySelector("#message");
const rssLink = document.querySelector("#rssLink");
const privacyCard = document.querySelector("#privacyCard");
const exportBackupButton = document.querySelector("#exportBackupButton");
const importBackupInput = document.querySelector("#importBackupInput");
const newFeedButton = document.querySelector("#newFeedButton");
const saveButton = document.querySelector("#saveButton");
const deleteButton = document.querySelector("#deleteButton");
const previewButton = document.querySelector("#previewButton");
const copyAdHocButton = document.querySelector("#copyAdHocButton");
const copySavedButton = document.querySelector("#copySavedButton");
const openBuilderButton = document.querySelector("#openBuilderButton");
const clearSelectionsButton = document.querySelector("#clearSelectionsButton");
const addCustomFieldButton = document.querySelector("#addCustomFieldButton");
const builderFrame = document.querySelector("#builderFrame");
const builderFrameWrap = document.querySelector("#builderFrameWrap");
const builderStatus = document.querySelector("#builderStatus");
const builderPickLabel = document.querySelector("#builderPickLabel");
const builderFrameMeta = document.querySelector("#builderFrameMeta");
const builderHint = document.querySelector("#builderHint");
const selectionList = document.querySelector("#selectionList");
const pickToolbar = document.querySelector("#pickToolbar");
const uiLanguageSelect = document.querySelector("#uiLanguageSelect");
const themeModeInputs = Array.from(document.querySelectorAll('input[name="themeMode"]'));
const customFieldPanel = document.querySelector("#customFieldPanel");
const customFieldName = document.querySelector("#customFieldName");
const customFieldModeInputs = Array.from(document.querySelectorAll('input[name="customFieldMode"]'));
const customValueField = document.querySelector("#customValueField");
const customFieldValue = document.querySelector("#customFieldValue");
const confirmCustomFieldButton = document.querySelector("#confirmCustomFieldButton");
const cancelCustomFieldButton = document.querySelector("#cancelCustomFieldButton");

const standardFields = [
  ["item", "field.item", "itemSelector"],
  ["title", "field.title", "titleSelector"],
  ["link", "field.link", "linkSelector"],
  ["summary", "field.summary", "summarySelector"],
  ["image", "field.image", "imageSelector"],
  ["date", "field.date", "dateSelector"]
];

const fieldLabelKeys = Object.fromEntries(standardFields.map(([key, labelKey]) => [key, labelKey]));
const fieldInputs = Object.fromEntries(standardFields.map(([key, , input]) => [key, input]));

const translations = {
  en: {
    appTitle: "RSS Builder",
    appSubtitle: "Local feed generator",
    uiLanguage: "Language",
    theme: "Theme",
    themeAuto: "Auto",
    themeLight: "Light",
    themeDark: "Dark",
    newFeed: "New Feed",
    privacyStatus: "Privacy status",
    privacyLoading: "Checking local privacy settings...",
    privacyLocal: "Local-only",
    privacyExposed: "Network-exposed",
    privacyTargetsBlocked: "Private targets blocked",
    privacyNoTelemetry: "No telemetry",
    privacyDirectFetch: "Direct fetches still reveal this machine or server IP to target websites.",
    exportBackup: "Export",
    importBackup: "Import",
    importedBackup: "Backup imported.",
    importFailed: "Could not import backup.",
    testFeed: "Test",
    testingFeed: "Testing...",
    healthUnknown: "Unknown",
    healthOk: "OK",
    healthWarning: "Check",
    healthError: "Error",
    healthItems: "{count} items",
    savedFeeds: "Saved Feeds",
    savedFeedsMeta: "Local recipes",
    buildFeed: "Build Feed",
    delete: "Delete",
    save: "Save",
    source: "Source",
    websiteUrl: "Website URL",
    openPage: "Open Page",
    clearPicks: "Clear Picks",
    visualBuilder: "Visual Builder",
    customData: "Custom Data",
    fieldName: "Field Name",
    customMode: "Value Source",
    pickFromPage: "Pick from page",
    fixedValue: "Fixed value",
    customValue: "Value",
    pickField: "Pick Field",
    addField: "Add Field",
    cancel: "Cancel",
    feedSettings: "Feed Settings",
    name: "Name",
    maxItems: "Max Items",
    feedTitle: "Feed Title",
    feedLanguage: "Feed Language",
    description: "Description",
    author: "Author",
    feedImageUrl: "Feed Image URL",
    advanced: "Advanced",
    renderMode: "Render Mode",
    auto: "Auto",
    static: "Static",
    browser: "Browser",
    cacheMinutes: "Cache Minutes",
    includePatterns: "Include Patterns",
    excludePatterns: "Exclude Patterns",
    waitForSelector: "Wait For Selector",
    extraWaitMs: "Extra Wait Ms",
    userAgent: "User Agent",
    preview: "Preview",
    copyAdHoc: "Copy RSS URL",
    copySaved: "Copy Saved RSS",
    emptyPreviewTitle: "No preview yet",
    emptyPreviewText: "Open a page or run preview.",
    footer: "Built by Ziya",
    ready: "Ready",
    loading: "Loading",
    extracting: "Extracting...",
    opening: "Opening...",
    saving: "Saving...",
    unsavedFeed: "Unsaved feed",
    noSavedFeeds: "No saved feeds.",
    notSelected: "Not selected",
    choose: "Choose",
    pick: "Pick",
    change: "Change",
    remove: "Remove",
    copied: "RSS URL copied.",
    newReady: "New feed ready.",
    deleted: "Feed deleted.",
    loaded: "Feed loaded.",
    saved: "Feed saved.",
    previewComplete: "Preview complete.",
    pageOpened: "Page opened.",
    picksCleared: "Picks cleared.",
    customFieldSaved: "Custom field saved.",
    enterFieldName: "Enter a field name.",
    enterCustomValue: "Enter a value.",
    selected: "{field} selected.",
    sourceMetric: "Source",
    statusMetric: "Status",
    fetchedMetric: "Fetched",
    imageMeta: "Image",
    itemsVia: "{count} items via {strategy}",
    builderHint: "Scroll inside the page and click one repeated card.",
    builderHintField: "Now click the {field} inside one selected card.",
    field: {
      item: "Feed Card",
      title: "Title",
      link: "Link",
      summary: "Summary",
      image: "Image",
      date: "Date"
    }
  },
  ru: {
    appTitle: "RSS Конструктор",
    appSubtitle: "Локальный генератор лент",
    uiLanguage: "Язык",
    newFeed: "Новая лента",
    savedFeeds: "Сохраненные ленты",
    savedFeedsMeta: "Локальные рецепты",
    buildFeed: "Собрать ленту",
    delete: "Удалить",
    save: "Сохранить",
    source: "Источник",
    websiteUrl: "URL сайта",
    openPage: "Открыть страницу",
    clearPicks: "Очистить выбор",
    visualBuilder: "Визуальный конструктор",
    customData: "Свои данные",
    fieldName: "Имя поля",
    customMode: "Источник значения",
    pickFromPage: "Выбрать на странице",
    fixedValue: "Фиксированное значение",
    customValue: "Значение",
    pickField: "Выбрать поле",
    addField: "Добавить поле",
    cancel: "Отмена",
    feedSettings: "Настройки ленты",
    name: "Название",
    maxItems: "Макс. элементов",
    feedTitle: "Заголовок ленты",
    feedLanguage: "Язык ленты",
    description: "Описание",
    author: "Автор",
    feedImageUrl: "URL изображения",
    advanced: "Дополнительно",
    renderMode: "Режим",
    auto: "Авто",
    static: "Статика",
    browser: "Браузер",
    cacheMinutes: "Кэш, мин",
    includePatterns: "Включать",
    excludePatterns: "Исключать",
    waitForSelector: "Ждать селектор",
    extraWaitMs: "Доп. ожидание, мс",
    userAgent: "User Agent",
    preview: "Предпросмотр",
    copyAdHoc: "Копировать RSS URL",
    copySaved: "Копировать RSS",
    emptyPreviewTitle: "Предпросмотра нет",
    emptyPreviewText: "Откройте страницу или запустите предпросмотр.",
    footer: "Сгенерировано Ziya",
    ready: "Готово",
    loading: "Загрузка",
    extracting: "Извлечение...",
    opening: "Открытие...",
    saving: "Сохранение...",
    unsavedFeed: "Несохраненная лента",
    noSavedFeeds: "Нет сохраненных лент.",
    notSelected: "Не выбрано",
    choose: "Выберите",
    pick: "Выбрать",
    change: "Изменить",
    remove: "Удалить",
    copied: "RSS URL скопирован.",
    newReady: "Новая лента готова.",
    deleted: "Лента удалена.",
    loaded: "Лента загружена.",
    saved: "Лента сохранена.",
    previewComplete: "Предпросмотр готов.",
    pageOpened: "Страница открыта.",
    picksCleared: "Выбор очищен.",
    customFieldSaved: "Пользовательское поле сохранено.",
    enterFieldName: "Введите имя поля.",
    enterCustomValue: "Введите значение.",
    selected: "Выбрано: {field}.",
    sourceMetric: "Источник",
    statusMetric: "Статус",
    fetchedMetric: "Загружено",
    imageMeta: "Изображение",
    itemsVia: "{count} элементов, режим {strategy}",
    builderHint: "Прокрутите страницу внутри окна и нажмите на повторяющуюся карточку.",
    builderHintField: "Теперь нажмите поле «{field}» внутри выбранной карточки.",
    field: {
      item: "Карточка",
      title: "Заголовок",
      link: "Ссылка",
      summary: "Описание",
      image: "Изображение",
      date: "Дата"
    }
  },
  es: {
    appTitle: "Constructor RSS",
    appSubtitle: "Generador local de feeds",
    uiLanguage: "Idioma",
    newFeed: "Nuevo feed",
    savedFeeds: "Feeds guardados",
    savedFeedsMeta: "Recetas locales",
    buildFeed: "Crear feed",
    delete: "Eliminar",
    save: "Guardar",
    source: "Fuente",
    websiteUrl: "URL del sitio",
    openPage: "Abrir página",
    clearPicks: "Limpiar selección",
    visualBuilder: "Constructor visual",
    customData: "Dato personalizado",
    fieldName: "Nombre del campo",
    customMode: "Origen del valor",
    pickFromPage: "Elegir en página",
    fixedValue: "Valor fijo",
    customValue: "Valor",
    pickField: "Elegir campo",
    addField: "Añadir campo",
    cancel: "Cancelar",
    feedSettings: "Ajustes del feed",
    name: "Nombre",
    maxItems: "Máx. elementos",
    feedTitle: "Título del feed",
    feedLanguage: "Idioma del feed",
    description: "Descripción",
    author: "Autor",
    feedImageUrl: "URL de imagen",
    advanced: "Avanzado",
    renderMode: "Modo de render",
    auto: "Auto",
    static: "Estático",
    browser: "Navegador",
    cacheMinutes: "Minutos de caché",
    includePatterns: "Incluir",
    excludePatterns: "Excluir",
    waitForSelector: "Esperar selector",
    extraWaitMs: "Espera extra, ms",
    userAgent: "User Agent",
    preview: "Vista previa",
    copyAdHoc: "Copiar URL RSS",
    copySaved: "Copiar RSS guardado",
    emptyPreviewTitle: "Sin vista previa",
    emptyPreviewText: "Abre una página o ejecuta la vista previa.",
    footer: "Generado por Ziya",
    ready: "Listo",
    loading: "Cargando",
    extracting: "Extrayendo...",
    opening: "Abriendo...",
    saving: "Guardando...",
    unsavedFeed: "Feed sin guardar",
    noSavedFeeds: "No hay feeds guardados.",
    notSelected: "Sin seleccionar",
    choose: "Elegir",
    pick: "Elegir",
    change: "Cambiar",
    remove: "Quitar",
    copied: "URL RSS copiada.",
    newReady: "Nuevo feed listo.",
    deleted: "Feed eliminado.",
    loaded: "Feed cargado.",
    saved: "Feed guardado.",
    previewComplete: "Vista previa lista.",
    pageOpened: "Página abierta.",
    picksCleared: "Selección limpiada.",
    customFieldSaved: "Campo personalizado guardado.",
    enterFieldName: "Escribe un nombre de campo.",
    enterCustomValue: "Escribe un valor.",
    selected: "{field} seleccionado.",
    sourceMetric: "Fuente",
    statusMetric: "Estado",
    fetchedMetric: "Obtenido",
    imageMeta: "Imagen",
    itemsVia: "{count} elementos vía {strategy}",
    builderHint: "Desplázate dentro de la página y haz clic en una tarjeta repetida.",
    builderHintField: "Ahora haz clic en {field} dentro de una tarjeta seleccionada.",
    field: {
      item: "Tarjeta",
      title: "Título",
      link: "Enlace",
      summary: "Resumen",
      image: "Imagen",
      date: "Fecha"
    }
  },
  zh: {
    appTitle: "RSS 构建器",
    appSubtitle: "本地 Feed 生成器",
    uiLanguage: "语言",
    newFeed: "新建 Feed",
    savedFeeds: "已保存 Feed",
    savedFeedsMeta: "本地规则",
    buildFeed: "构建 Feed",
    delete: "删除",
    save: "保存",
    source: "来源",
    websiteUrl: "网站 URL",
    openPage: "打开页面",
    clearPicks: "清除选择",
    visualBuilder: "可视化构建器",
    customData: "自定义数据",
    fieldName: "字段名",
    customMode: "值来源",
    pickFromPage: "从页面选择",
    fixedValue: "固定值",
    customValue: "值",
    pickField: "选择字段",
    addField: "添加字段",
    cancel: "取消",
    feedSettings: "Feed 设置",
    name: "名称",
    maxItems: "最大条目",
    feedTitle: "Feed 标题",
    feedLanguage: "Feed 语言",
    description: "描述",
    author: "作者",
    feedImageUrl: "图片 URL",
    advanced: "高级",
    renderMode: "渲染模式",
    auto: "自动",
    static: "静态",
    browser: "浏览器",
    cacheMinutes: "缓存分钟",
    includePatterns: "包含",
    excludePatterns: "排除",
    waitForSelector: "等待选择器",
    extraWaitMs: "额外等待 ms",
    userAgent: "User Agent",
    preview: "预览",
    copyAdHoc: "复制 RSS URL",
    copySaved: "复制已保存 RSS",
    emptyPreviewTitle: "暂无预览",
    emptyPreviewText: "打开页面或运行预览。",
    footer: "由 Ziya 生成",
    ready: "就绪",
    loading: "加载中",
    extracting: "提取中...",
    opening: "打开中...",
    saving: "保存中...",
    unsavedFeed: "未保存 Feed",
    noSavedFeeds: "没有已保存 Feed。",
    notSelected: "未选择",
    choose: "选择",
    pick: "选择",
    change: "更改",
    remove: "移除",
    copied: "RSS URL 已复制。",
    newReady: "新 Feed 已准备。",
    deleted: "Feed 已删除。",
    loaded: "Feed 已加载。",
    saved: "Feed 已保存。",
    previewComplete: "预览完成。",
    pageOpened: "页面已打开。",
    picksCleared: "选择已清除。",
    customFieldSaved: "自定义字段已保存。",
    enterFieldName: "请输入字段名。",
    enterCustomValue: "请输入值。",
    selected: "已选择 {field}。",
    sourceMetric: "来源",
    statusMetric: "状态",
    fetchedMetric: "获取时间",
    imageMeta: "图片",
    itemsVia: "{count} 条，模式 {strategy}",
    builderHint: "在页面内滚动，然后点击一个重复卡片。",
    builderHintField: "现在点击已选卡片里的 {field}。",
    field: {
      item: "Feed 卡片",
      title: "标题",
      link: "链接",
      summary: "摘要",
      image: "图片",
      date: "日期"
    }
  },
  tr: {
    appTitle: "RSS Oluşturucu",
    appSubtitle: "Yerel feed oluşturucu",
    uiLanguage: "Dil",
    newFeed: "Yeni Feed",
    savedFeeds: "Kayıtlı Feedler",
    savedFeedsMeta: "Yerel tarifler",
    buildFeed: "Feed Oluştur",
    delete: "Sil",
    save: "Kaydet",
    source: "Kaynak",
    websiteUrl: "Web sitesi URL",
    openPage: "Sayfayı Aç",
    clearPicks: "Seçimleri Temizle",
    visualBuilder: "Görsel Oluşturucu",
    customData: "Özel Veri",
    fieldName: "Alan adı",
    customMode: "Değer kaynağı",
    pickFromPage: "Sayfadan seç",
    fixedValue: "Sabit değer",
    customValue: "Değer",
    pickField: "Alan Seç",
    addField: "Alan ekle",
    cancel: "İptal",
    feedSettings: "Feed Ayarları",
    name: "Ad",
    maxItems: "Maks. öğe",
    feedTitle: "Feed başlığı",
    feedLanguage: "Feed dili",
    description: "Açıklama",
    author: "Yazar",
    feedImageUrl: "Görsel URL",
    advanced: "Gelişmiş",
    renderMode: "İşleme modu",
    auto: "Otomatik",
    static: "Statik",
    browser: "Tarayıcı",
    cacheMinutes: "Önbellek dk",
    includePatterns: "Dahil et",
    excludePatterns: "Hariç tut",
    waitForSelector: "Seçiciyi bekle",
    extraWaitMs: "Ek bekleme ms",
    userAgent: "User Agent",
    preview: "Önizleme",
    copyAdHoc: "RSS URL kopyala",
    copySaved: "Kayıtlı RSS kopyala",
    emptyPreviewTitle: "Önizleme yok",
    emptyPreviewText: "Bir sayfa açın veya önizleme çalıştırın.",
    footer: "Ziya tarafından oluşturuldu",
    ready: "Hazır",
    loading: "Yükleniyor",
    extracting: "Çıkarılıyor...",
    opening: "Açılıyor...",
    saving: "Kaydediliyor...",
    unsavedFeed: "Kaydedilmemiş feed",
    noSavedFeeds: "Kayıtlı feed yok.",
    notSelected: "Seçilmedi",
    choose: "Seç",
    pick: "Seç",
    change: "Değiştir",
    remove: "Kaldır",
    copied: "RSS URL kopyalandı.",
    newReady: "Yeni feed hazır.",
    deleted: "Feed silindi.",
    loaded: "Feed yüklendi.",
    saved: "Feed kaydedildi.",
    previewComplete: "Önizleme hazır.",
    pageOpened: "Sayfa açıldı.",
    picksCleared: "Seçimler temizlendi.",
    customFieldSaved: "Özel alan kaydedildi.",
    enterFieldName: "Alan adı girin.",
    enterCustomValue: "Bir değer girin.",
    selected: "{field} seçildi.",
    sourceMetric: "Kaynak",
    statusMetric: "Durum",
    fetchedMetric: "Alındı",
    imageMeta: "Görsel",
    itemsVia: "{count} öğe, mod {strategy}",
    builderHint: "Sayfanın içinde kaydırın ve tekrar eden bir karta tıklayın.",
    builderHintField: "Şimdi seçili kart içinde {field} alanına tıklayın.",
    field: {
      item: "Feed Kartı",
      title: "Başlık",
      link: "Bağlantı",
      summary: "Özet",
      image: "Görsel",
      date: "Tarih"
    }
  },
  az: {
    appTitle: "RSS Qurucu",
    appSubtitle: "Lokal feed generatoru",
    uiLanguage: "Dil",
    newFeed: "Yeni Feed",
    savedFeeds: "Saxlanmış Feedlər",
    savedFeedsMeta: "Lokal reseptlər",
    buildFeed: "Feed Qur",
    delete: "Sil",
    save: "Saxla",
    source: "Mənbə",
    websiteUrl: "Sayt URL-i",
    openPage: "Səhifəni Aç",
    clearPicks: "Seçimləri Təmizlə",
    visualBuilder: "Vizual Qurucu",
    customData: "Özəl Məlumat",
    fieldName: "Sahə adı",
    customMode: "Dəyər mənbəyi",
    pickFromPage: "Səhifədən seç",
    fixedValue: "Sabit dəyər",
    customValue: "Dəyər",
    pickField: "Sahəni Seç",
    addField: "Sahə əlavə et",
    cancel: "Ləğv et",
    feedSettings: "Feed Ayarları",
    name: "Ad",
    maxItems: "Maks. element",
    feedTitle: "Feed başlığı",
    feedLanguage: "Feed dili",
    description: "Təsvir",
    author: "Müəllif",
    feedImageUrl: "Şəkil URL-i",
    advanced: "Geniş",
    renderMode: "Render rejimi",
    auto: "Avto",
    static: "Statik",
    browser: "Brauzer",
    cacheMinutes: "Keş dəqiqə",
    includePatterns: "Daxil et",
    excludePatterns: "Çıxar",
    waitForSelector: "Selektoru gözlə",
    extraWaitMs: "Əlavə gözləmə ms",
    userAgent: "User Agent",
    preview: "Önizləmə",
    copyAdHoc: "RSS URL kopyala",
    copySaved: "Saxlanmış RSS kopyala",
    emptyPreviewTitle: "Önizləmə yoxdur",
    emptyPreviewText: "Səhifə açın və ya önizləmə edin.",
    footer: "Ziya tərəfindən yaradılıb",
    ready: "Hazır",
    loading: "Yüklənir",
    extracting: "Çıxarılır...",
    opening: "Açılır...",
    saving: "Saxlanılır...",
    unsavedFeed: "Saxlanmamış feed",
    noSavedFeeds: "Saxlanmış feed yoxdur.",
    notSelected: "Seçilməyib",
    choose: "Seç",
    pick: "Seç",
    change: "Dəyiş",
    remove: "Sil",
    copied: "RSS URL kopyalandı.",
    newReady: "Yeni feed hazırdır.",
    deleted: "Feed silindi.",
    loaded: "Feed yükləndi.",
    saved: "Feed saxlanıldı.",
    previewComplete: "Önizləmə hazırdır.",
    pageOpened: "Səhifə açıldı.",
    picksCleared: "Seçimlər təmizləndi.",
    customFieldSaved: "Özəl sahə saxlanıldı.",
    enterFieldName: "Sahə adı daxil edin.",
    enterCustomValue: "Dəyər daxil edin.",
    selected: "{field} seçildi.",
    sourceMetric: "Mənbə",
    statusMetric: "Status",
    fetchedMetric: "Alındı",
    imageMeta: "Şəkil",
    itemsVia: "{count} element, rejim {strategy}",
    builderHint: "Səhifənin içində sürüşdürün və təkrarlanan karta klikləyin.",
    builderHintField: "İndi seçilmiş kartın içində {field} sahəsinə klikləyin.",
    field: {
      item: "Feed kartı",
      title: "Başlıq",
      link: "Keçid",
      summary: "Xülasə",
      image: "Şəkil",
      date: "Tarix"
    }
  }
};

let locale = localStorage.getItem("rss-builder-locale") || "en";
const themeModes = new Set(["auto", "light", "dark"]);
const themePreference = window.matchMedia("(prefers-color-scheme: dark)");
let themeMode = localStorage.getItem("rss-builder-theme") || "auto";
if (!themeModes.has(themeMode)) themeMode = "auto";

let activeFeedId = null;
let activePick = "item";
let customFields = [];
let editingCustomFieldName = null;
let selectionSamples = {};
let lastAdHocUrl = "";
let lastSavedUrl = "";
let lastPreviewResult = null;
let lastPreviewUrl = "";
let savedFeeds = [];
let feedHealth = {};
let privacyInfo = null;

const emptyConfig = {
  url: "",
  name: "",
  mode: "auto",
  maxItems: 25,
  cacheMinutes: 30,
  includePatterns: [],
  excludePatterns: [],
  preferExistingFeeds: false,
  selectors: {
    item: "",
    title: "",
    link: "",
    summary: "",
    date: "",
    image: ""
  },
  customFields: [],
  browser: {
    waitForSelector: "",
    waitMs: 0,
    userAgent: ""
  },
  feed: {
    title: "",
    description: "",
    language: "en",
    author: "",
    image: "",
    copyright: ""
  }
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await preview();
});

newFeedButton.addEventListener("click", () => {
  activeFeedId = null;
  lastSavedUrl = "";
  customFields = [];
  selectionSamples = {};
  activePick = "item";
  fillForm(emptyConfig);
  renderActiveLabel();
  copySavedButton.disabled = true;
  deleteButton.disabled = true;
  builderFrameWrap.hidden = true;
  builderFrame.removeAttribute("srcdoc");
  setMessage(t("newReady"), "info");
  renderVisualState();
  markActiveFeed();
});

saveButton.addEventListener("click", async () => {
  await saveFeed();
});

deleteButton.addEventListener("click", async () => {
  if (!activeFeedId) return;
  const response = await fetch(`/api/feeds/${activeFeedId}`, { method: "DELETE" });
  if (!response.ok) {
    setMessage(await errorMessage(response), "error");
    return;
  }
  activeFeedId = null;
  lastSavedUrl = "";
  customFields = [];
  selectionSamples = {};
  copySavedButton.disabled = true;
  deleteButton.disabled = true;
  fillForm(emptyConfig);
  await loadFeeds();
  renderVisualState();
  setMessage(t("deleted"), "info");
});

copyAdHocButton.addEventListener("click", () => copyText(lastAdHocUrl));
copySavedButton.addEventListener("click", () => copyText(lastSavedUrl));
openBuilderButton.addEventListener("click", () => openVisualBuilder());
clearSelectionsButton.addEventListener("click", clearSelections);
addCustomFieldButton.addEventListener("click", addCustomField);
confirmCustomFieldButton.addEventListener("click", confirmCustomField);
cancelCustomFieldButton.addEventListener("click", hideCustomFieldPanel);
exportBackupButton.addEventListener("click", exportBackup);
importBackupInput.addEventListener("change", () => importBackup());
for (const input of customFieldModeInputs) {
  input.addEventListener("change", () => {
    syncCustomFieldMode();
    if (getCustomFieldMode() === "static") customFieldValue.focus();
  });
}
customFieldName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmCustomField();
  }
  if (event.key === "Escape") {
    hideCustomFieldPanel();
  }
});
customFieldValue.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    confirmCustomField();
  }
  if (event.key === "Escape") {
    hideCustomFieldPanel();
  }
});
uiLanguageSelect.addEventListener("change", () => {
  locale = uiLanguageSelect.value;
  localStorage.setItem("rss-builder-locale", locale);
  applyLocale();
});

for (const input of themeModeInputs) {
  input.addEventListener("change", () => {
    if (!input.checked || !themeModes.has(input.value)) return;
    themeMode = input.value;
    localStorage.setItem("rss-builder-theme", themeMode);
    applyThemeMode();
  });
}

themePreference.addEventListener("change", () => {
  if (themeMode === "auto") applyThemeMode();
});

pickToolbar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pick]");
  if (!button) return;
  setActivePick(button.dataset.pick);
});

selectionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pick],[data-edit-custom],[data-delete-custom]");
  if (!button) return;

  if (button.dataset.deleteCustom) {
    customFields = customFields.filter((field) => field.name !== button.dataset.deleteCustom);
    delete selectionSamples[`custom:${button.dataset.deleteCustom}`];
    if (activePick === `custom:${button.dataset.deleteCustom}`) activePick = "item";
    renderVisualState();
    postBuilderState();
    return;
  }

  if (button.dataset.editCustom) {
    editCustomField(button.dataset.editCustom);
    return;
  }

  setActivePick(button.dataset.pick);
  if (builderFrameWrap.hidden && read(new FormData(form), "url")) {
    void openVisualBuilder();
  }
});

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "rss-builder-selection") return;
  applyVisualSelection(event.data.selection);
});

builderFrame.addEventListener("load", () => {
  postBuilderState();
});

uiLanguageSelect.value = translations[locale] ? locale : "en";
locale = uiLanguageSelect.value;
applyThemeMode();
applyLocale();
await loadPrivacy();
await loadFeeds();
fillForm(emptyConfig);
renderVisualState();

async function preview() {
  setBusy(true, t("extracting"));
  try {
    const response = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readForm())
    });

    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    lastAdHocUrl = payload.rssUrl;
    lastPreviewResult = payload.result;
    lastPreviewUrl = payload.rssUrl;
    copyAdHocButton.disabled = false;
    renderPreview(payload.result, payload.rssUrl);
    setMessage(t("previewComplete"), "info");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function openVisualBuilder() {
  const config = readForm();
  if (!config.url) {
    form.reportValidity();
    return;
  }

  setBusy(true, t("opening"));
  openBuilderButton.disabled = true;
  builderFrameMeta.textContent = t("loading");

  try {
    const response = await fetch("/api/builder-page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    builderFrameWrap.hidden = false;
    builderFrame.srcdoc = payload.snapshot.html;
    builderFrameMeta.textContent = `${payload.snapshot.strategy} ${payload.snapshot.status || "OK"}`;
    if (payload.snapshot.issues.length > 0) {
      setMessage(payload.snapshot.issues[0].message, "error");
    } else {
      setMessage(t("pageOpened"), "info");
    }
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    openBuilderButton.disabled = false;
    setBusy(false);
    renderVisualState();
  }
}

async function saveFeed() {
  setBusy(true, t("saving"));
  try {
    const config = readForm();
    const response = await fetch(activeFeedId ? `/api/feeds/${activeFeedId}` : "/api/feeds", {
      method: activeFeedId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });

    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    activeFeedId = payload.feed.id;
    lastSavedUrl = payload.rssUrl;
    copySavedButton.disabled = false;
    deleteButton.disabled = false;
    renderActiveLabel(payload.feed);
    await loadFeeds();
    setMessage(t("saved"), "info");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(false);
  }
}

async function loadPrivacy() {
  try {
    const response = await fetch("/api/privacy");
    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    privacyInfo = payload.privacy;
    renderPrivacy(privacyInfo);
  } catch (error) {
    const text = privacyCard.querySelector("p");
    privacyCard.classList.add("warning");
    if (text) text.textContent = error.message;
  }
}

function renderPrivacy(privacy) {
  const title = privacyCard.querySelector("strong");
  const text = privacyCard.querySelector("p");
  privacyCard.classList.toggle("warning", !privacy.localOnly);
  if (title) title.textContent = `${t("privacyStatus")}: ${privacy.localOnly ? t("privacyLocal") : t("privacyExposed")}`;
  if (text) {
    text.textContent = [
      privacy.privateNetworkTargets === "blocked" ? t("privacyTargetsBlocked") : privacy.privateNetworkTargets,
      t("privacyNoTelemetry"),
      t("privacyDirectFetch")
    ].join(" · ");
  }
}

async function loadFeeds() {
  const [response, healthResponse] = await Promise.all([fetch("/api/feeds"), fetch("/api/feed-health")]);
  if (!response.ok) throw new Error(await errorMessage(response));
  const payload = await response.json();
  if (healthResponse.ok) {
    const healthPayload = await healthResponse.json();
    feedHealth = healthPayload.health || {};
  }
  savedFeeds = payload.feeds;
  renderFeedList();
}

function renderFeedList() {
  feedList.innerHTML = "";

  if (savedFeeds.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-sidebar";
    empty.textContent = t("noSavedFeeds");
    feedList.append(empty);
    return;
  }

  for (const feed of savedFeeds) {
    const health = feedHealth[feed.id];
    const row = document.createElement("article");
    row.className = "feed-row";

    const selectButton = document.createElement("button");
    selectButton.className = "feed-select";
    selectButton.type = "button";
    selectButton.dataset.feedId = feed.id;
    selectButton.innerHTML = `<strong></strong><span></span><small></small>`;
    selectButton.querySelector("strong").textContent = feed.name || feed.feed.title || new URL(feed.url).hostname;
    selectButton.querySelector("span").textContent = feed.url;
    selectButton.querySelector("small").textContent = healthSummary(health);
    selectButton.addEventListener("click", () => selectFeed(feed.id));

    const badge = document.createElement("span");
    badge.className = `health-pill ${healthClass(health)}`;
    badge.textContent = healthLabel(health);

    const testButton = document.createElement("button");
    testButton.className = "mini-button";
    testButton.type = "button";
    testButton.textContent = t("testFeed");
    testButton.addEventListener("click", () => testFeed(feed.id, testButton));

    row.append(selectButton, badge, testButton);
    feedList.append(row);
  }

  markActiveFeed();
}

async function testFeed(id, button) {
  button.disabled = true;
  button.textContent = t("testingFeed");

  try {
    const response = await fetch(`/api/feeds/${id}/test`, { method: "POST" });
    if (!response.ok) throw new Error(await errorMessage(response));
    const payload = await response.json();
    feedHealth[id] = payload.health;
    renderFeedList();
    setMessage(`${healthLabel(payload.health)}: ${healthSummary(payload.health)}`, payload.health.status === "error" ? "error" : "info");
  } catch (error) {
    setMessage(error.message, "error");
    button.disabled = false;
    button.textContent = t("testFeed");
  }
}

async function exportBackup() {
  try {
    const response = await fetch("/api/export");
    if (!response.ok) throw new Error(await errorMessage(response));
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rss-generator-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    setMessage(error.message, "error");
  }
}

async function importBackup() {
  const file = importBackupInput.files?.[0];
  if (!file) return;

  try {
    const backup = JSON.parse(await file.text());
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feeds: backup.feeds || [], mode: "merge" })
    });
    if (!response.ok) throw new Error(await errorMessage(response));
    await loadFeeds();
    setMessage(t("importedBackup"), "info");
  } catch {
    setMessage(t("importFailed"), "error");
  } finally {
    importBackupInput.value = "";
  }
}

async function selectFeed(id) {
  const response = await fetch(`/api/feeds/${id}`);
  if (!response.ok) {
    setMessage(await errorMessage(response), "error");
    return;
  }

  const payload = await response.json();
  activeFeedId = payload.feed.id;
  lastSavedUrl = `${location.origin}/rss/${payload.feed.id}.xml`;
  copySavedButton.disabled = false;
  deleteButton.disabled = false;
  fillForm(payload.feed);
  renderActiveLabel(payload.feed);
  markActiveFeed();
  renderVisualState();
  postBuilderState();
  setMessage(t("loaded"), "info");
}

function readForm() {
  const data = new FormData(form);
  return {
    url: read(data, "url"),
    name: read(data, "name"),
    mode: read(data, "mode") || "auto",
    maxItems: Number(read(data, "maxItems") || 25),
    cacheMinutes: Number(read(data, "cacheMinutes") || 30),
    includePatterns: splitLines(read(data, "includePatterns")),
    excludePatterns: splitLines(read(data, "excludePatterns")),
    preferExistingFeeds: false,
    selectors: {
      item: read(data, "itemSelector"),
      title: read(data, "titleSelector"),
      link: read(data, "linkSelector"),
      summary: read(data, "summarySelector"),
      date: read(data, "dateSelector"),
      image: read(data, "imageSelector")
    },
    customFields: customFields
      .map(normalizeCustomField)
      .filter((field) => field.name && ((field.mode === "static" && field.value) || (field.mode !== "static" && field.selector))),
    browser: {
      waitForSelector: read(data, "waitForSelector"),
      waitMs: Number(read(data, "waitMs") || 0),
      userAgent: read(data, "userAgent")
    },
    feed: {
      title: read(data, "feedTitle"),
      description: read(data, "feedDescription"),
      language: read(data, "language") || "en",
      author: read(data, "author"),
      image: read(data, "feedImage"),
      copyright: ""
    }
  };
}

function fillForm(config) {
  const merged = deepMerge(emptyConfig, config);
  customFields = (merged.customFields || []).map(normalizeCustomField).filter((field) => field.name);
  selectionSamples = {};
  hideCustomFieldPanel();
  setValue("url", merged.url);
  setValue("name", merged.name);
  setRadio("mode", merged.mode);
  setValue("maxItems", merged.maxItems);
  setValue("cacheMinutes", merged.cacheMinutes);
  setValue("includePatterns", merged.includePatterns.join("\n"));
  setValue("excludePatterns", merged.excludePatterns.join("\n"));
  setValue("itemSelector", merged.selectors.item);
  setValue("titleSelector", merged.selectors.title);
  setValue("linkSelector", merged.selectors.link);
  setValue("summarySelector", merged.selectors.summary);
  setValue("dateSelector", merged.selectors.date);
  setValue("imageSelector", merged.selectors.image);
  setValue("waitForSelector", merged.browser.waitForSelector);
  setValue("waitMs", merged.browser.waitMs);
  setValue("userAgent", merged.browser.userAgent);
  setValue("feedTitle", merged.feed.title);
  setValue("feedDescription", merged.feed.description);
  setValue("language", merged.feed.language);
  setValue("author", merged.feed.author);
  setValue("feedImage", merged.feed.image);
  renderVisualState();
}

function applyVisualSelection(selection) {
  if (!selection?.selector) return;

  if (selection.field.startsWith("custom:")) {
    const name = selection.field.slice("custom:".length);
    customFields = customFields.map((field) =>
      field.name === name
        ? { ...field, mode: "selector", selector: selection.selector, value: "", attr: selection.attr || "text" }
        : field
    );
  } else if (fieldInputs[selection.field]) {
    setValue(fieldInputs[selection.field], selection.selector);
  }

  selectionSamples[selection.field] = selection.sample || selection.selector;
  moveToNextPick(selection.field);
  renderVisualState();
  postBuilderState();
  setMessage(t("selected", { field: labelForPick(selection.field) }), "info");
}

function moveToNextPick(field) {
  const order = ["item", "title", "link", "summary", "image", "date"];
  const currentIndex = order.indexOf(field);
  if (currentIndex >= 0 && currentIndex < order.length - 1) {
    activePick = order[currentIndex + 1];
  }
}

function setActivePick(field) {
  activePick = field;
  renderVisualState();
  postBuilderState();
}

function addCustomField() {
  openCustomFieldPanel();
}

function editCustomField(name) {
  const field = customFields.find((item) => item.name === name);
  if (!field) return;
  openCustomFieldPanel(field);
}

function openCustomFieldPanel(field = null) {
  editingCustomFieldName = field?.name || null;
  customFieldPanel.hidden = false;
  customFieldName.value = field?.name || "";
  customFieldValue.value = field?.value || "";
  setCustomFieldMode(field?.mode === "static" ? "static" : "selector");
  syncCustomFieldMode();

  const focusTarget = field?.mode === "static" ? customFieldValue : customFieldName;
  focusTarget.focus();
  focusTarget.select();
}

function confirmCustomField() {
  const name = sanitizeCustomName(customFieldName.value);
  if (!name) {
    setMessage(t("enterFieldName"), "error");
    customFieldName.focus();
    return;
  }

  const mode = getCustomFieldMode();
  if (editingCustomFieldName && editingCustomFieldName !== name) {
    customFields = customFields.filter((field) => field.name !== editingCustomFieldName);
    delete selectionSamples[`custom:${editingCustomFieldName}`];
    if (activePick === `custom:${editingCustomFieldName}`) activePick = "item";
  }

  const existingIndex = customFields.findIndex((field) => field.name === name);
  const existingField = existingIndex >= 0 ? customFields[existingIndex] : null;

  if (mode === "static") {
    const value = customFieldValue.value.trim();
    if (!value) {
      setMessage(t("enterCustomValue"), "error");
      customFieldValue.focus();
      return;
    }

    const nextField = normalizeCustomField({
      ...(existingField || {}),
      name,
      mode: "static",
      selector: "",
      value,
      attr: "text"
    });

    upsertCustomField(existingIndex, nextField);
    selectionSamples[`custom:${name}`] = value;
    if (activePick === `custom:${name}`) activePick = "item";
    hideCustomFieldPanel();
    renderVisualState();
    postBuilderState();
    setMessage(t("customFieldSaved"), "info");
    return;
  }

  const nextField = normalizeCustomField({
    ...(existingField || {}),
    name,
    mode: "selector",
    selector: existingField?.mode === "selector" ? existingField.selector : "",
    value: "",
    attr: existingField?.attr || "text"
  });

  upsertCustomField(existingIndex, nextField);
  delete selectionSamples[`custom:${name}`];
  hideCustomFieldPanel();
  setActivePick(`custom:${name}`);
  if (builderFrameWrap.hidden && read(new FormData(form), "url")) {
    void openVisualBuilder();
  }
}

function hideCustomFieldPanel() {
  customFieldPanel.hidden = true;
  editingCustomFieldName = null;
}

function getCustomFieldMode() {
  return customFieldModeInputs.find((input) => input.checked)?.value || "selector";
}

function setCustomFieldMode(mode) {
  const safeMode = mode === "static" ? "static" : "selector";
  for (const input of customFieldModeInputs) {
    input.checked = input.value === safeMode;
  }
}

function syncCustomFieldMode() {
  const mode = getCustomFieldMode();
  customValueField.hidden = mode !== "static";
  confirmCustomFieldButton.textContent = mode === "static" ? t("addField") : t("pickField");
}

function upsertCustomField(index, field) {
  if (index >= 0) {
    customFields[index] = field;
    return;
  }
  customFields.push(field);
}

function normalizeCustomField(field) {
  const mode = field?.mode === "static" ? "static" : "selector";
  return {
    name: sanitizeCustomName(field?.name || ""),
    mode,
    selector: mode === "selector" ? String(field?.selector || "").trim() : "",
    value: mode === "static" ? String(field?.value || "").trim() : "",
    attr: field?.attr || "text"
  };
}

function clearSelections() {
  for (const [, , input] of standardFields) setValue(input, "");
  customFields = [];
  selectionSamples = {};
  activePick = "item";
  hideCustomFieldPanel();
  renderVisualState();
  postBuilderState();
  setMessage(t("picksCleared"), "info");
}

function renderVisualState() {
  const selections = currentSelections();
  builderStatus.textContent = `${t("choose")} ${labelForPick(activePick)}`;
  builderPickLabel.textContent = labelForPick(activePick);
  if (builderHint) {
    builderHint.textContent =
      activePick === "item"
        ? t("builderHint")
        : t("builderHintField", { field: labelForPick(activePick) });
  }

  for (const button of pickToolbar.querySelectorAll("[data-pick]")) {
    const field = button.dataset.pick;
    button.textContent = labelForPick(field);
    button.classList.toggle("active", field === activePick);
    button.classList.toggle("done", Boolean(selections[field]));
  }

  selectionList.innerHTML = "";
  const rows = [
    ...standardFields.map(([field, labelKey]) => ({
      field,
      label: t(labelKey),
      selector: selections[field],
      sample: selectionSamples[field]
    })),
    ...customFields.map((field) => ({
      field: `custom:${field.name}`,
      label: field.name,
      name: field.name,
      mode: field.mode,
      selector: field.mode === "static" ? field.value : field.selector,
      sample:
        field.mode === "static"
          ? `${t("fixedValue")}: ${field.value}`
          : selectionSamples[`custom:${field.name}`],
      custom: true
    }))
  ];

  for (const row of rows) {
    const element = document.createElement("div");
    element.className = "selection-row";
    element.innerHTML = `<strong></strong><span></span><div></div>`;
    element.querySelector("strong").textContent = row.label;
    element.querySelector("span").textContent = row.sample || row.selector || t("notSelected");

    const actions = element.querySelector("div");
    const pickButton = document.createElement("button");
    pickButton.className = "mini-button";
    pickButton.type = "button";
    if (row.custom && row.mode === "static") {
      pickButton.dataset.editCustom = row.name;
    } else {
      pickButton.dataset.pick = row.field;
    }
    pickButton.textContent = row.selector ? t("change") : t("pick");
    actions.append(pickButton);

    if (row.custom) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "mini-button";
      deleteButton.type = "button";
      deleteButton.dataset.deleteCustom = row.name;
      deleteButton.textContent = t("remove");
      actions.append(deleteButton);
    }

    selectionList.append(element);
  }
}

function postBuilderState() {
  if (!builderFrame.contentWindow) return;
  builderFrame.contentWindow.postMessage(
    {
      type: "rss-builder-state",
      activeField: activePick,
      itemSelector: form.elements.namedItem("itemSelector")?.value || "",
      selections: currentSelections()
    },
    "*"
  );
}

function currentSelections() {
  const selections = {};
  for (const [field, , input] of standardFields) {
    const value = form.elements.namedItem(input)?.value || "";
    if (value) selections[field] = value;
  }
  for (const field of customFields) {
    if (field.mode !== "static" && field.selector) selections[`custom:${field.name}`] = field.selector;
  }
  return selections;
}

function renderPreview(result, url) {
  previewMeta.textContent = t("itemsVia", { count: String(result.items.length), strategy: result.strategy });
  rssLink.hidden = false;
  rssLink.textContent = url;

  const summary = document.createElement("div");
  summary.className = "summary-grid";
  summary.innerHTML = `
    <div class="metric"><span></span><strong></strong></div>
    <div class="metric"><span></span><strong></strong></div>
    <div class="metric"><span></span><strong></strong></div>
  `;
  summary.children[0].querySelector("span").textContent = t("sourceMetric");
  summary.children[1].querySelector("span").textContent = t("statusMetric");
  summary.children[2].querySelector("span").textContent = t("fetchedMetric");
  summary.children[0].querySelector("strong").textContent = result.title || result.finalUrl;
  summary.children[1].querySelector("strong").textContent = result.blocked ? "Blocked" : String(result.status || "OK");
  summary.children[2].querySelector("strong").textContent = new Date(result.fetchedAt).toLocaleString();

  previewOutput.innerHTML = "";
  previewOutput.append(summary);

  if (result.issues.length > 0) {
    const issues = document.createElement("div");
    issues.className = "issue-list";
    for (const issue of result.issues) {
      const row = document.createElement("div");
      row.className = "issue";
      row.textContent = issue.message;
      issues.append(row);
    }
    previewOutput.append(issues);
  }

  if (result.existingFeeds.length > 0) {
    const existing = document.createElement("div");
    existing.className = "existing-list";
    for (const feed of result.existingFeeds) {
      const row = document.createElement("div");
      row.className = "existing-feed";
      const link = document.createElement("a");
      link.href = feed.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = feed.title || feed.url;
      row.append(link);
      existing.append(row);
    }
    previewOutput.append(existing);
  }

  const itemList = document.createElement("div");
  itemList.className = "preview-output";
  for (const item of result.items) {
    const card = document.createElement("article");
    card.className = "item-card";
    const link = document.createElement("a");
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = item.title;
    card.append(link);

    const meta = document.createElement("div");
    meta.className = "item-meta";
    if (item.date) meta.append(metaText(new Date(item.date).toLocaleString()));
    if (item.image) meta.append(metaText(t("imageMeta")));
    for (const [name, value] of Object.entries(item.custom || {})) {
      meta.append(metaText(`${name}: ${value}`));
    }
    if (meta.childNodes.length > 0) card.append(meta);

    if (item.summary) {
      const summaryText = document.createElement("p");
      summaryText.textContent = item.summary;
      card.append(summaryText);
    }

    itemList.append(card);
  }
  previewOutput.append(itemList);
}

function metaText(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element;
}

function renderActiveLabel(feed) {
  if (!feed) {
    activeFeedLabel.textContent = activeFeedId ? activeFeedId : t("unsavedFeed");
    return;
  }
  activeFeedLabel.textContent = feed.name || feed.feed.title || feed.id;
}

function markActiveFeed() {
  for (const button of feedList.querySelectorAll(".feed-select")) {
    button.classList.toggle("active", button.dataset.feedId === activeFeedId);
  }
}

function healthClass(health) {
  if (!health?.status) return "unknown";
  return health.status;
}

function healthLabel(health) {
  if (!health?.status) return t("healthUnknown");
  if (health.status === "ok") return t("healthOk");
  if (health.status === "warning") return t("healthWarning");
  if (health.status === "error") return t("healthError");
  return t("healthUnknown");
}

function healthSummary(health) {
  if (!health?.checkedAt) return t("healthUnknown");
  if (health.status === "error") return health.error || t("healthError");
  const count = typeof health.itemCount === "number" ? t("healthItems", { count: String(health.itemCount) }) : t("healthUnknown");
  return `${count} · ${new Date(health.checkedAt).toLocaleString()}`;
}

function setBusy(isBusy, label = "") {
  previewButton.disabled = isBusy;
  saveButton.disabled = isBusy;
  previewButton.textContent = isBusy ? label : t("preview");
}

function setMessage(text, type) {
  message.hidden = !text;
  message.textContent = text || "";
  message.classList.toggle("error", type === "error");
}

function read(data, key) {
  return String(data.get(key) || "").trim();
}

function splitLines(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function setValue(name, value) {
  const field = form.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function setRadio(name, value) {
  const field = form.querySelector(`input[name="${name}"][value="${value}"]`);
  if (field) field.checked = true;
}

function deepMerge(base, value) {
  const output = structuredClone(base);
  for (const [key, val] of Object.entries(value || {})) {
    if (val && typeof val === "object" && !Array.isArray(val) && key in output) {
      output[key] = deepMerge(output[key], val);
    } else {
      output[key] = val;
    }
  }
  return output;
}

function labelForPick(field) {
  if (field.startsWith("custom:")) return field.slice("custom:".length);
  const key = fieldLabelKeys[field];
  return key ? t(key) : field;
}

function sanitizeCustomName(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/^[^A-Za-z]+/, "")
    .slice(0, 40);
  return cleaned || "";
}

async function copyText(value) {
  if (!value) return;
  await navigator.clipboard.writeText(value);
  setMessage(t("copied"), "info");
}

async function errorMessage(response) {
  try {
    const payload = await response.json();
    if (payload.details) {
      return `${payload.error} ${payload.details.map((item) => `${item.path}: ${item.message}`).join("; ")}`;
    }
    return payload.error || response.statusText;
  } catch {
    return response.statusText;
  }
}

function applyThemeMode() {
  const effectiveTheme = themeMode === "auto" ? (themePreference.matches ? "dark" : "light") : themeMode;
  document.documentElement.dataset.themeMode = themeMode;
  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.style.colorScheme = effectiveTheme;

  for (const input of themeModeInputs) {
    input.checked = input.value === themeMode;
  }
}

function applyLocale() {
  document.documentElement.lang = locale;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }

  for (const button of pickToolbar.querySelectorAll("[data-field-label]")) {
    button.textContent = labelForPick(button.dataset.fieldLabel);
  }

  if (!activeFeedId) renderActiveLabel();
  if (previewMeta.textContent === "Ready" || Object.values(translations).some((dict) => dict.ready === previewMeta.textContent)) {
    previewMeta.textContent = t("ready");
  }
  if (builderFrameMeta.textContent === "Ready" || Object.values(translations).some((dict) => dict.ready === builderFrameMeta.textContent)) {
    builderFrameMeta.textContent = t("ready");
  }
  const emptySidebar = feedList.querySelector(".empty-sidebar");
  if (emptySidebar) emptySidebar.textContent = t("noSavedFeeds");
  syncCustomFieldMode();
  if (lastPreviewResult) {
    renderPreview(lastPreviewResult, lastPreviewUrl);
  }
  if (privacyInfo) renderPrivacy(privacyInfo);
  renderFeedList();
  renderVisualState();
}

function t(path, replacements = {}) {
  const value = getTranslation(translations[locale], path) ?? getTranslation(translations.en, path) ?? path;
  return Object.entries(replacements).reduce((text, [key, replacement]) => {
    return text.replace(`{${key}}`, replacement);
  }, value);
}

function getTranslation(source, path) {
  return path.split(".").reduce((value, key) => (value && value[key] !== undefined ? value[key] : undefined), source);
}
