import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, X, Edit2, Trash2, Download, Upload, ChevronDown, ChevronRight, Image as ImageIcon, Calendar, Tag, AlertCircle, Filter, MessageSquare, Info, LogOut, Lock, Eye, EyeOff, FileText, Loader } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// === Firebase 設定 ===
// 主 project：負責資料庫（Firestore）
const firebaseConfig = {
  apiKey: "AIzaSyBC9Iq-HL3w7yklHQHhuS8u1eFh861eKJg",
  authDomain: "comart-roadmap.firebaseapp.com",
  projectId: "comart-roadmap",
  storageBucket: "comart-roadmap.firebasestorage.app",
  messagingSenderId: "104108613534",
  appId: "1:104108613534:web:314f16d77bed32906e808f"
};

// 副 project：負責檔案儲存（Storage，老闆已升級 Blaze）
const storageFirebaseConfig = {
  apiKey: "AIzaSyDA62jzXGCLpini3cP4KTN0f0Rv94uGIII",
  authDomain: "comart-product.firebaseapp.com",
  projectId: "comart-product",
  storageBucket: "comart-product.firebasestorage.app",
  messagingSenderId: "33682188853",
  appId: "1:33682188853:web:f2e72868ebd769d5121f7c"
};

const firebaseApp = initializeApp(firebaseConfig);
const storageApp = initializeApp(storageFirebaseConfig, 'storage');
const db = getFirestore(firebaseApp);
const storage = getStorage(storageApp);
const PROJECTS_COL = 'roadmap_projects';
const CATEGORY_COL = 'code_categories';
const FEATURE_COL = 'code_features';
const STORAGE_FOLDER = 'roadmap';

// === 簡易密碼設定 ===
// 之後可改成從 Firestore users collection 讀取
const USERS = {
  'nina': { password: 'nina2026', role: 'admin', name: 'Nina' },
  'viewer': { password: 'comart', role: 'viewer', name: '檢視者' },
};

const APP_VERSION = 'v0.33.0';
const BUILD_ID = '20260509-1900';

const VERSION_HISTORY = [
  {
    version: 'v0.33.0',
    date: '2026-05-09',
    changes: [
      '🎉 主頁產品支援拖曳排序',
      '把性質相似的產品拖在一起，排序儲存到雲端，所有人看到一樣的順序',
      '拖曳中：原位變半透明、目標位置出現藍色框',
      '篩選後仍可拖曳，只動可見產品的相對順序',
    ],
  },
  {
    version: 'v0.32.0',
    date: '2026-05-09',
    changes: [
      '🔧 列表縮圖改為「完整顯示」（不再切圖），背景改白色',
      '🎉 每張產品圖可切換「完整顯示 ⊟ / 填滿格子 ⊞」（hover 時的小按鈕）',
      '🔧 主頁預設篩選器改為「全部」（之前是「設計中」）',
    ],
  },
  {
    version: 'v0.31.0',
    date: '2026-05-09',
    changes: [
      '🎉 附件區塊新增「全部下載」按鈕（有 2+ 個檔案時出現）',
      '🔧 日期輸入限制年份為 4 位（解決打成 6 位數的問題）',
      '🎉 複製產品時改為完整複製（圖片、版本、進度、訂單全部複製過去）',
      '只有料號清空（必須重新編碼），其他資料保留讓使用者自己刪',
      '🎉 手板總覽改版面：左側顯示產品圖、右側突出產品名/料號/數量/位置',
      '手板總覽的版本/材質/變更說明保留但放在次要位置',
      '手板若有自己的圖片附件會優先顯示，否則用產品主圖',
    ],
  },
  {
    version: 'v0.30.0',
    date: '2026-05-09',
    changes: [
      '🎉 手板訂單補強欄位：對應 ID 版本、對應 3D 版本、材質',
      '🎉 手板訂單可上傳附件（測試報告、影片、圖片）',
      '🎉 頂部新增「📦 手板總覽」按鈕（跨產品手板清單）',
      '手板總覽：自動彙整所有產品的手板，無需手動同步',
      '手板總覽支援篩選（狀態、位置、供應商）和搜尋',
      '手板總覽支援匯出 CSV（方便傳給老闆/同事）',
      '點任一手板可直接跳到該產品詳細頁',
    ],
  },
  {
    version: 'v0.29.0',
    date: '2026-05-08',
    changes: [
      '🎉 ID/3D 版本可折疊（解決檔案多時拉太長的問題）',
      '最新版本預設展開，其他舊版本預設收起',
      '收起時標題顯示摘要：版本號、日期、📋BOM 標記、N 檔/M BOM',
      '點標題列可展開/收起',
      '收起的版本中編輯/刪除按鈕需展開後才出現',
    ],
  },
  {
    version: 'v0.28.0',
    date: '2026-05-08',
    changes: [
      '🔧 BOM 區塊改為需要勾選才顯示（解決畫面太亂的問題）',
      '版本卡片預設不顯示 BOM 區塊',
      '滑鼠 hover 版本卡片 → 出現「☐ 有 BOM」勾選框',
      '勾選後 → 出現 BOM 上傳區（可上傳檔案或貼連結）',
      '若已上傳 BOM 檔案 → 自動視為有 BOM，固定顯示',
    ],
  },
  {
    version: 'v0.27.0',
    date: '2026-05-08',
    changes: [
      '🎉 BOM 改為「綁定在 ID/3D 版本下」（之前是獨立區塊）',
      '版本卡片若有 BOM 會顯示「📋 已出 BOM」標記',
      '每個 ID/3D 版本下都有專屬 BOM 區塊（可上傳 BOM 檔案）',
      '舊版獨立 BOM 紀錄會在黃色區塊顯示，可手動整理刪除',
      '設計版本標題列會顯示「N 個版本 · M BOM」摘要',
    ],
  },
  {
    version: 'v0.26.0',
    date: '2026-05-08',
    changes: [
      '🎉 進度紀錄區塊也支援 Ctrl+V 貼上圖片',
      '🎉 新增 ID/3D/BOM 版本時，自動帶入下一個版本號（V1、V2、V3...）',
      '🎉 編輯分類碼/特徵碼可拖曳排序，順序儲存到雲端',
      '🔧 修正：編輯後重開順序會亂掉的問題（保留 order 欄位）',
    ],
  },
  {
    version: 'v0.25.0',
    date: '2026-05-07',
    changes: [
      '🎉 圖片支援「複製貼上」（Ctrl+V）',
      '滑鼠 hover 在「產品圖片」或「附件區塊」時按 Ctrl+V 可直接貼上剪貼簿圖片',
      '🎉 編碼精靈支援自訂分類碼/特徵碼',
      '點精靈右上角「⚙ 編輯規則」進入編輯模式',
      '可修改備註說明、新增/刪除分類（已被使用的無法刪）',
      '所有改動雲端同步，同事即時看到新增的分類',
      '分類碼/特徵碼從寫死改為儲存在 Firestore（首次部署自動種子化）',
    ],
  },
  {
    version: 'v0.24.0',
    date: '2026-05-07',
    changes: [
      '🎉 編碼精靈改為「單頁全展開」介面',
      '分類碼 7 個 + 特徵碼 7 個全部一次顯示，可隨時更改不需「上一步」',
      '頂部顯示 SOP 優先規則提示（QIC、MNT、HDM）',
      '每個選項旁有適用情境說明',
      '已選的分類/特徵會在標題旁顯示，一目了然',
      '主頁列表：供應商加上框框（跟其他標籤統一）',
    ],
  },
  {
    version: 'v0.23.0',
    date: '2026-05-07',
    changes: [
      '🔧 修正：圖片過一陣子變全白的問題',
      '新增 StorageImage 智慧元件：偵測圖片載入失敗時，會用 Storage 路徑重新取得 URL',
      '所有顯示 Storage 圖片的地方（列表縮圖、產品圖、進度紀錄圖、附件圖）都改用此元件',
      '即使 Firebase Storage 的下載 token 過期，圖片仍能正常顯示',
    ],
  },
  {
    version: 'v0.22.0',
    date: '2026-05-07',
    changes: [
      '🎉 詳細頁料號旁加「✨ 編碼精靈」按鈕（隨時可用）',
      '🔧 改料號時，類別自動跟著更新（除非已手動覆蓋）',
      '主頁列表卡片移除：類別文字、郵件圖示按鈕（保留詳細頁的郵件主旨功能）',
      '主頁列表卡片移除：階段下方的「手板 0/0 已收到」子文字',
      '主頁列表只保留：設計狀態、供應商、自訂標籤',
    ],
  },
  {
    version: 'v0.21.0',
    date: '2026-05-06',
    changes: [
      '🔧 修正：詳細頁編輯料號時加入重複偵測（紅框警告 + 儲存確認）',
      '🎉 複製產品時保留：產品圖片、設計版本、DFM（之前會清空）',
      '料號編輯時自動轉大寫、使用等寬字體',
    ],
  },
  {
    version: 'v0.20.0',
    date: '2026-05-06',
    changes: [
      '🎉 編碼精靈改為「步驟式問答」，依新版 SOP v1.0 流程逐步判斷',
      '分類碼新增 CMR (Camera Mount，相機相關)',
      '分類碼判斷流程：QIC 優先 → 是否可拆卸 → A+B 結構 → 一體式',
      '特徵碼判斷流程：MNT (車用) → HDM (Heavy Duty) → SCP/CLP/MAG/TND/NON',
      '精靈會記錄並顯示「推導路徑」(讓你看清楚怎麼選到這個碼)',
      '隨時可按「上一步」回去重選',
    ],
  },
  {
    version: 'v0.19.0',
    date: '2026-05-06',
    changes: [
      '🎉 複製產品後自動跳出料號編碼精靈，不會料號重複',
      '🎉 新增「全部階段」下拉篩選器（規劃 / EVT / DVT / PVT / MP）',
      '🎉 從 Chrome 開的 SharePoint / 網頁拖檔案，會自動轉成「連結附件」',
      '拖網頁連結進來會抽出網頁標題作為顯示名稱',
      '保留標籤篩選器（用不到時可從「管理標籤」清空）',
    ],
  },
  {
    version: 'v0.18.0',
    date: '2026-05-05',
    changes: [
      '🔧 修正：複製產品時雲端儲存失敗（_docId undefined 問題）',
      '🔧 修正：拖曳檔案時上傳框閃爍、無法對位的問題（用 dragCounter 解決）',
      '雲端儲存自動清除 undefined 欄位，避免類似錯誤',
    ],
  },
  {
    version: 'v0.17.0',
    date: '2026-05-05',
    changes: [
      '刪除「DFM 中」狀態（保留：設計中 / 設計完成 / 暫停 / 取消）',
      '🎉 產品圖片上傳前可選取裁剪區域（拖曳框、可移動可縮放）',
      '🎉 新增「複製產品」按鈕（詳細頁右上角 📋）',
      '複製時保留設定但清空料號、進度、訂單、試模等資料',
      '修復：拖曳檔案到頁面外時瀏覽器跳走的 bug',
    ],
  },
  {
    version: 'v0.16.1',
    date: '2026-05-05',
    changes: [
      '🎉 全部檔案上傳區塊支援拖放上傳（從電腦、SharePoint 拖檔案進來即可）',
      '產品圖片區塊也支援拖放上傳',
      '「狀態」改為「設計狀態」',
      '狀態選項改為：設計中 / DFM 中 / 設計完成 / 暫停 / 取消',
      '篩選器預設為「設計中」',
      '舊資料「進行中」「完成」「待開案」仍可正常顯示',
      '郵件主旨升級為多條清單，每條可標記「內部 / 客戶 / 其他」',
      '每條郵件主旨都可獨立點擊到 Outlook 搜尋',
      '列表卡片若多條郵件主旨會顯示 📧×N 數量',
    ],
  },
  {
    version: 'v0.15.0',
    date: '2026-05-05',
    changes: [
      '產品階段文字調整（DVT = DFA/DFM 設計驗證、PVT = 試產）',
      '階段自動推算邏輯配合新定義（DFM 完成 → DVT、有試模 → PVT）',
      '新增「郵件主旨」欄位（新增表單 + 詳細頁）',
      '產品列表顯示 📧 圖示，點擊直接打開 Outlook Web 搜尋對應信件',
      '詳細頁有獨立的郵件主旨區塊，可即時編輯與快速搜尋',
    ],
  },
  {
    version: 'v0.14.0',
    date: '2026-05-05',
    changes: [
      '類別欄位改為從料號自動推算（依編碼 SOP）',
      '新增專案：類別欄會即時顯示推算結果（例：MGM · 磁吸 / 吸盤）',
      '可手動覆蓋類別（特殊狀況用）',
      '若已手動覆蓋，可點「還原自動」回到推算值',
      '舊料號（不符合 SOP 格式）會保留原本手動輸入的類別',
    ],
  },
  {
    version: 'v0.13.0',
    date: '2026-05-05',
    changes: [
      '🎉 新增「料號編碼精靈」（依 COMART 編碼 SOP）',
      '在新增專案時，料號欄位旁有「✨ 自動產生」按鈕',
      '3 步驟引導：分類碼（QIC/MGM/HDR/BKT/OTH/MOD）→ 特徵碼（S/C/G/T/H/M/N）→ 流水號',
      '系統自動偵測下一個可用流水號，杜絕重複編碼',
      '支援後綴（-A / -B 變體、-S 配套）',
      '料號欄位有即時重複偵測（紅框警告）',
      '料號自動轉大寫',
    ],
  },
  {
    version: 'v0.12.0',
    date: '2026-05-05',
    changes: [
      '🎉 重大升級：所有檔案可直接上傳（不必跳到 Google Drive）',
      '產品圖片改用 Firebase Storage（comart-product project）',
      '進度紀錄圖片改用 Firebase Storage',
      '所有附件區塊（ID/3D/BOM/DFM/T1-T4/手板/模具）支援檔案上傳',
      '支援檔案類型：PNG、JPG、PDF、Excel、Word、STP/STEP、ZIP 等',
      '圖片直接顯示縮圖、PDF 在系統內彈窗預覽，不開新分頁',
      '上傳大小上限 20MB（產品圖片 10MB），超過請改貼 Google Drive 連結',
      '保留「貼連結」功能（用於超大檔案如 STP）',
    ],
  },
  {
    version: 'v0.11.0',
    date: '2026-05-05',
    changes: [
      '進度紀錄移到「產品階段」下方（最常看的優先顯示）',
      'ID 圖 / 3D 圖 / BOM 各版本可附加檔案連結（PDF / STP / Excel）',
      'DFM 區塊可附加檔案連結',
      'T1 ~ T4 試模可附加試模報告連結',
      '料號申請新增「料號編號」欄位（申請後填入正式料號）',
      '檔案連結支援 Google Drive / SharePoint / OneDrive 等任何雲端硬碟',
    ],
  },
  {
    version: 'v0.10.0',
    date: '2026-05-04',
    changes: [
      '修復登入後出現空白頁的 bug（登入時自動重新整理）',
      '新增「管理標籤」功能（標籤下拉旁的圖示按鈕）',
      '可批次刪除標籤，會自動從所有相關專案中移除',
      '顯示每個標籤被多少個專案使用',
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-05-04',
    changes: [
      '624067094f7f7528800590fd53ef770b5230516890e851675bb9Ff08542b624b677f30016a2151778a0255ae300150f9683cFf09',
      '6aa28996800553ea662f300c4e0d80fd4fee6539300dFf0c4ecd53ef770b516890e88cc78a0a',
    ],
  },
  {
    version: 'v0.8.0',
    date: '2026-05-04',
    changes: [
      '🎉 重大升級：接上 Firebase 雲端資料庫',
      '所有裝置即時同步（手機、電腦、家裡公司都看到最新資料）',
      '新增登入機制（admin / viewer 兩種權限）',
      '檢視者看不到價格、供應商、訂單編號等敏感資訊',
      '保留 JSON 匯出 / 匯入作為備份',
      '架構與 COMART 報價系統一致（Firebase + GitHub Pages）',
    ],
  },
  {
    version: 'v0.7.0',
    date: '2026-05-04',
    changes: [
      '🎉 重大升級：資料自動保存到瀏覽器',
      '關閉視窗後重新打開，所有資料都還在',
      'Header 加入「已保存」即時狀態指示燈',
      '不再需要每次手動匯入 JSON',
      '建議仍每週匯出 JSON 備份一次',
    ],
  },
  {
    version: 'v0.6.0',
    date: '2026-05-04',
    changes: [
      'COMART logo 尺寸縮小（更精緻的 header）',
      '新增資料持久化說明文件',
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-05-04',
    changes: [
      '新增 COMART 公司 logo 與版本號顯示',
      '導入 EVT/DVT/PVT/MP 業界標準階段',
      '「目前階段」改為顯示流程節點而非訂單數量',
      '系統自動判斷階段，可手動覆蓋',
      '新增版本歷史檢視功能',
    ],
  },
  {
    version: 'v0.4.0',
    date: '2026-05-04',
    changes: [
      '重大升級：完整生命週期管理',
      '新增設計圖紙版本控制（ID/3D/BOM）',
      '新增手板訂單系統（單號、料號、價格、存放位置、評價）',
      '新增模具訂單系統',
      '新增 T1~T4 試模紀錄',
      '新增料號申請狀態追蹤',
      'DFM 改為可選項目',
    ],
  },
  {
    version: 'v0.3.0',
    date: '2026-05-04',
    changes: [
      '新增產品圖片功能（可上傳多張、設定主圖）',
      '列表卡片左側顯示產品縮圖',
      '移除預設展覽用樣標籤',
    ],
  },
  {
    version: 'v0.2.0',
    date: '2026-05-04',
    changes: [
      '依週會工作流簡化為單視圖',
      '新增進度時間軸（每筆紀錄帶日期）',
      '最新更新明顯顯示，舊紀錄可摺疊',
      '更新可附圖片',
      '新增自定義標籤系統',
    ],
  },
  {
    version: 'v0.1.0',
    date: '2026-05-04',
    changes: [
      '初始版本',
      '三視圖架構（總覽 / 看板 / 列表）',
      '基本 CRUD 與 Excel 匯入匯出',
    ],
  },
];

const COMART_LOGO_BASE64 = 'data:image/png;base64,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';

const PHASE_DEFINITIONS = [
  { key: '規劃', label: '規劃', subtitle: '設計階段', desc: '尚未開始手板，仍在 ID/3D/BOM 設計' },
  { key: 'EVT', label: 'EVT', subtitle: '工程驗證 / 手板', desc: '透過手板驗證設計可行性' },
  { key: 'DVT', label: 'DVT', subtitle: '設計驗證 (DFA, DFM)', desc: '完成 DFA/DFM 設計驗證' },
  { key: 'PVT', label: 'PVT', subtitle: '試產', desc: 'T1~T4 試模、量產前最終驗證' },
  { key: 'MP', label: 'MP', subtitle: '量產', desc: '料號已申請，正式量產' },
];

const PHASE_COLORS = {
  '規劃': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400' },
  'EVT': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
  'DVT': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', dot: 'bg-blue-500' },
  'PVT': { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', dot: 'bg-violet-500' },
  'MP': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
};


const STATUS_OPTIONS = ['設計中', '設計完成', '暫停', '取消'];
const STATUS_COLORS = {
  '設計中': 'bg-blue-100 text-blue-800 border-blue-300',
  '設計完成': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  '暫停': 'bg-amber-100 text-amber-800 border-amber-300',
  '取消': 'bg-rose-100 text-rose-800 border-rose-300',
  // 兼容舊資料：
  'DFM 中': 'bg-violet-100 text-violet-800 border-violet-300',
  '進行中': 'bg-blue-100 text-blue-800 border-blue-300',
  '完成': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  '待開案': 'bg-slate-100 text-slate-700 border-slate-300',
};
const STATUS_DOTS = {
  '設計中': 'bg-blue-500',
  '設計完成': 'bg-emerald-500',
  '暫停': 'bg-amber-500',
  '取消': 'bg-rose-500',
  // 兼容：
  'DFM 中': 'bg-violet-500',
  '進行中': 'bg-blue-500',
  '完成': 'bg-emerald-500',
  '待開案': 'bg-slate-400',
};

const LIFECYCLE_PHASES = ['設計', 'DFM', '手板', '模具', '試模', '料號'];

const TRIAL_ROUNDS = ['T1', 'T2', 'T3', 'T4'];

const ORDER_STATUS = ['已下單', '生產中', '已收到', '已取消'];
const ORDER_STATUS_COLORS = {
  '已下單': 'bg-blue-100 text-blue-700 border-blue-200',
  '生產中': 'bg-amber-100 text-amber-700 border-amber-200',
  '已收到': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '已取消': 'bg-slate-100 text-slate-600 border-slate-200',
};

const STAGES = [];  // legacy, kept for backward compat with old data imports


const SEED_DATA = [
  {
    id: 1,
    name: '可折疊連結桿 Big screen bracket',
    code: 'CMMS0005',
    status: '進行中',
    supplier: '恆群',
    idDesigner: '素亦',
    threeDDesigner: '恆群',
    openDate: '2025-12-23',
    category: 'MagSafe 系列',
    productImages: [],
    tags: [],
    designs: {
      ID: [
        { version: 'V2', date: '2026-04-26', notes: '磁鐵頭要去掉平台，兩邊維持雙面使用', images: [] },
        { version: 'V1', date: '2026-02-24', notes: '初版設計：可正反使用、裝飾蓋遮擋孔洞', images: [] },
      ],
      '3D': [
        { version: 'V2', date: '2026-03-11', notes: '硅膠裝飾蓋改塑膠（先開一套模）', images: [] },
        { version: 'V1', date: '2026-02-02', notes: '初版 3D，固定頭可拆卸換面', images: [] },
      ],
      BOM: [
        { version: 'V1', date: '2026-03-15', notes: '主結構塑膠 + 磁鐵 N52 ×4', images: [] },
      ],
    },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [
      {
        id: 'p1', orderNo: 'PT-CMMS0005-01', partNo: 'CMMS0005-PT-V1',
        supplier: '恆群', quantity: 6, unitPrice: 1200, currency: 'TWD',
        orderDate: '2026-03-20', status: '已收到', storageLocation: '辦公室樣品櫃 A-3',
        review: 'V1 共 6 套：MagSafe 轉 MagSafe×2、17mm 轉強磁×2、3M 轉 MagSafe×1、強磁轉 MagSafe×1。整體 OK，磁吸力足夠',
      },
    ],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-04-26', text: '按照最新圖面安排手板，磁鐵頭要去掉平台，兩邊維持雙面使用', images: [] },
      { date: '2026-03-11', text: '硅膠裝飾蓋改塑膠（現階段先開一套模）', images: [] },
      { date: '2026-02-24', text: '優化外觀：比例要可正反使用、裝飾蓋遮擋孔洞', images: [] },
    ],
    notes: 'V1 手板共 6 套已完成，效果良好',
  },
  {
    id: 2,
    name: 'MagSafe 磁吸式健身器材握把支架',
    code: 'CMMS0012',
    status: '進行中',
    supplier: '恆群',
    idDesigner: '素亦',
    threeDDesigner: '恆群',
    openDate: '2025-12-19',
    category: 'Gym 系列',
    productImages: [],
    tags: ['#高優先', '#通路要'],
    designs: {
      ID: [
        { version: 'V1', date: '2026-01-10', notes: '初版：MagSafe + 17mm 球頭通用設計', images: [] },
      ],
      '3D': [
        { version: 'V2', date: '2026-03-19', notes: '吸力修正：增加磁鐵數量到 5 顆 N52', images: [] },
        { version: 'V1', date: '2026-02-15', notes: '初版 3D', images: [] },
      ],
      BOM: [
        { version: 'V1', date: '2026-02-20', notes: '5 顆強力 N52 磁鐵 + 17mm 球頭', images: [] },
      ],
    },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [
      {
        id: 'p1', orderNo: 'PT-CMMS0012-01', partNo: 'CMMS0012-PT-V1',
        supplier: '恆群', quantity: 3, unitPrice: 800, currency: 'TWD',
        orderDate: '2026-02-25', status: '已收到', storageLocation: '辦公室樣品櫃 A-5',
        review: 'V1 樣品 - 吸力不夠，需調整磁鐵配置',
      },
      {
        id: 'p2', orderNo: 'PT-CMMS0012-02', partNo: 'CMMS0012-PT-V2',
        supplier: '恆群', quantity: 5, unitPrice: 950, currency: 'TWD',
        orderDate: '2026-03-15', status: '已收到', storageLocation: '辦公室樣品櫃 A-5',
        review: 'V2 樣品 OK，吸力符合需求。第一批先跟越南購買 1K 球頭',
      },
    ],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-04-30', text: '球頭用標準 17mm，第一批先跟越南購買 1K 球頭，之後可能要從恆群直接開', images: [] },
      { date: '2026-03-19', text: 'V2 樣品 OK', images: [] },
    ],
    notes: '採用 5 顆強力 N52 磁鐵，相容 MagSafe 磁吸功能',
  },
  {
    id: 3,
    name: '平板夾具-IDA HDUTG',
    code: 'CMBH0002',
    status: '進行中',
    supplier: '恆群',
    idDesigner: '素亦',
    threeDDesigner: '恆群',
    openDate: '2025-08-12',
    category: 'HD 系列',
    productImages: [],
    tags: ['#高優先'],
    designs: {
      ID: [
        { version: 'V1', date: '2025-09-05', notes: 'SS 發起的自我開發，香港展用', images: [] },
      ],
      '3D': [
        { version: 'V2', date: '2026-01-20', notes: '優化夾具結構', images: [] },
        { version: 'V1', date: '2025-10-15', notes: '初版 3D', images: [] },
      ],
      BOM: [
        { version: 'V1', date: '2025-11-10', notes: '完整 BOM', images: [] },
      ],
    },
    hasDFM: true,
    dfmNotes: 'DFM 已給 Chris，T1 預計 3/26',
    prototypeOrders: [
      {
        id: 'p1', orderNo: 'PT-CMBH0002-01', partNo: 'CMBH0002-PT-V1',
        supplier: '恆群', quantity: 2, unitPrice: 1500, currency: 'TWD',
        orderDate: '2025-11-25', status: '已收到', storageLocation: '辦公室樣品櫃 B-2',
        review: 'V1 手板 OK',
      },
      {
        id: 'p2', orderNo: 'PT-CMBH0002-02', partNo: 'CMBH0002-PT-V2',
        supplier: '恆群', quantity: 5, unitPrice: 1500, currency: 'TWD',
        orderDate: '2026-01-15', status: '已收到', storageLocation: '已寄客戶 (FedEx #888539381808)',
        review: 'V2 手板已寄客人確認',
      },
    ],
    mouldOrders: [
      {
        id: 'm1', orderNo: 'MD-CMBH0002-01', partNo: 'CMBH0002-MD-01',
        supplier: '恆群', quantity: 1, unitPrice: 280000, currency: 'TWD',
        orderDate: '2026-02-10', status: '生產中',
        notes: '主結構模具',
      },
    ],
    trialRuns: [
      { round: 'T1', date: '2026-03-26', issues: '預計 3/26 試模，等待結果' },
    ],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-03-26', text: 'DFM/3D/DFA 已給 Chris，T1 預計 3/26', images: [] },
      { date: '2026-02-06', text: '手板 V2 已寄給客人 (FedEx #888539381808)', images: [] },
    ],
    notes: 'SS 發起的自我開發，香港展 LOGO 部分要帶平整的樣品',
  },
  {
    id: 4,
    name: 'Qi2.2 磁鐵頭 (球窩版)',
    code: 'CMBH0001',
    status: '進行中',
    supplier: '素亦',
    idDesigner: '素亦',
    threeDDesigner: '素亦',
    openDate: '2025-08-19',
    category: 'Qi 充電系列',
    productImages: [],
    tags: ['#高優先', '#認證中'],
    designs: {
      ID: [
        { version: 'V1', date: '2025-09-10', notes: '初版設計', images: [] },
      ],
      '3D': [
        { version: 'V1', date: '2025-10-05', notes: '初版 3D', images: [] },
      ],
      BOM: [
        { version: 'V2', date: '2025-12-20', notes: '修正後 BOM', images: [] },
        { version: 'V1', date: '2025-11-15', notes: '初版 BOM', images: [] },
      ],
    },
    hasDFM: true,
    dfmNotes: 'DFM 已完成',
    prototypeOrders: [
      {
        id: 'p1', orderNo: 'PT-CMBH0001-01', partNo: 'CMBH0001-PT-V1',
        supplier: '素亦', quantity: 5, unitPrice: 600, currency: 'TWD',
        orderDate: '2025-12-01', status: '已收到', storageLocation: '辦公室樣品櫃 C-1',
        review: '手板 OK',
      },
    ],
    mouldOrders: [
      {
        id: 'm1', orderNo: 'MD-CMBH0001-01', partNo: 'CMBH0001-MD-01',
        supplier: '素亦', quantity: 1, unitPrice: 350000, currency: 'TWD',
        orderDate: '2026-01-05', status: '已收到',
        notes: '模具已開好',
      },
    ],
    trialRuns: [
      { round: 'T1', date: '2026-01-20', issues: 'EMC 沒過，需修正' },
      { round: 'T2', date: '2026-02-15', issues: '修正後通過 EMC，但細節需調整' },
    ],
    materialCodeStatus: '申請中',
    trialNotes: '台灣做 BSMI 認證中',
    updates: [
      { date: '2026-03-17', text: '測試都完成了，阿杏驗證報告下周遞文件，兩周後證書下來', images: [] },
      { date: '2026-03-03', text: '樣品寄回台做認證 要一個月', images: [] },
    ],
    notes: '台灣做 BSMI 認證中，模具已開好',
  },
  {
    id: 5,
    name: '螢幕後摺疊支架 (塑膠)',
    code: 'CMMS0018',
    status: '進行中',
    supplier: '恆群',
    idDesigner: '素亦',
    threeDDesigner: '恆群',
    openDate: '2025-09-16',
    category: 'MagSafe 系列',
    productImages: [],
    tags: ['#專利評估中'],
    designs: {
      ID: [
        { version: 'V2', date: '2026-02-24', notes: '大型手機直立時不能卡到', images: [] },
        { version: 'V1', date: '2025-10-20', notes: '初版設計', images: [] },
      ],
      '3D': [
        { version: 'V2', date: '2026-02-24', notes: '驗證彎折機構平整度問題', images: [] },
        { version: 'V1', date: '2025-11-30', notes: '初版 3D', images: [] },
      ],
      BOM: [],
    },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-03-23', text: '要評估專利，展覽要有 3 套樣品', images: [] },
      { date: '2026-02-24', text: '大型手機直立時不能卡到，驗證彎折機構平整度問題，更新 3D', images: [] },
    ],
    notes: '一邊 MagSafe，一邊也可以是凝膠/奈米膠。要做一個可替換的 MAGSAFE 頭進去',
  },
  {
    id: 6,
    name: '通用手機夾具',
    code: 'CMBH0008',
    status: '進行中',
    supplier: '恆群',
    idDesigner: '恆群',
    threeDDesigner: '恆群',
    openDate: '2025-12-30',
    category: '車用系列',
    productImages: [],
    tags: [],
    designs: {
      ID: [
        { version: 'V1', date: '2026-01-20', notes: '初版設計：左右夾臂手動調整', images: [] },
      ],
      '3D': [],
      BOM: [],
    },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-03-11', text: '排隊出 3D', images: [] },
      { date: '2026-02-02', text: '左右夾臂手動調整在用工具固定（用螺絲固定），背後減震要是獨立模組', images: [] },
    ],
    notes: '放在機車上，要再詳細定義產品',
  },
  {
    id: 7,
    name: '雙 MagSafe 磁吸支架',
    code: '7PP6MT0069',
    status: '完成',
    supplier: '素亦',
    idDesigner: '素亦',
    threeDDesigner: '素亦',
    openDate: '2024-08-09',
    category: 'MagSafe 系列',
    productImages: [],
    tags: ['#待開模', '#已推廣'],
    designs: {
      ID: [{ version: 'V1', date: '2024-09-01', notes: '完整設計', images: [] }],
      '3D': [{ version: 'V1', date: '2024-10-01', notes: '完整 3D', images: [] }],
      BOM: [{ version: 'V1', date: '2024-10-15', notes: '完整 BOM', images: [] }],
    },
    hasDFM: true,
    dfmNotes: '',
    prototypeOrders: [
      {
        id: 'p1', orderNo: 'PT-MS0069-01', partNo: 'MS0069-PT-V1',
        supplier: '素亦', quantity: 10, unitPrice: 500, currency: 'TWD',
        orderDate: '2024-10-20', status: '已收到', storageLocation: '辦公室樣品櫃 A-1',
        review: '量產前最終樣品確認 OK',
      },
    ],
    mouldOrders: [
      {
        id: 'm1', orderNo: 'MD-MS0069-01', partNo: 'MS0069-MD-01',
        supplier: '素亦', quantity: 1, unitPrice: 250000, currency: 'TWD',
        orderDate: '2024-11-01', status: '已收到',
        notes: '主模具',
      },
    ],
    trialRuns: [
      { round: 'T1', date: '2024-11-20', issues: '小調整' },
      { round: 'T2', date: '2024-12-05', issues: '無問題' },
    ],
    materialCodeStatus: '已申請',
    trialNotes: '',
    updates: [
      { date: '2024-12-13', text: '素亦出貨，開始推廣', images: [] },
    ],
    notes: '完成但等客戶需求再開新批次模具',
  },
  {
    id: 8,
    name: '頸繩手袋磁吸扣',
    code: '',
    status: '暫停',
    supplier: '恆群',
    idDesigner: '恆群',
    threeDDesigner: '恆群',
    openDate: '2025-12-22',
    category: '配件系列',
    productImages: [],
    tags: [],
    designs: {
      ID: [{ version: 'V1', date: '2026-01-15', notes: '塑膠版方案', images: [] }],
      '3D': [{ version: 'V1', date: '2026-02-01', notes: '左右按鈕做大一點', images: [] }],
      BOM: [],
    },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    trialNotes: '',
    updates: [
      { date: '2026-03-11', text: '暫停', images: [] },
      { date: '2026-02-02', text: '做便宜塑膠版方案，預計 2/10 提供圖面', images: [] },
    ],
    notes: '福威買競品，待越南',
  },
];

export default function ProductRoadmap() {
  // === 登入狀態（用 sessionStorage 保存，關閉瀏覽器就要重登）===
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('comart_roadmap_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  const [projects, setProjects] = useState([]);
  const [categoryCodes, setCategoryCodes] = useState(DEFAULT_CATEGORY_CODES);
  const [featureCodes, setFeatureCodes] = useState(DEFAULT_FEATURE_CODES);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(true);

  // === 攔截全頁拖放，避免使用者把檔案放在拖放區外時瀏覽器跳走 ===
  useEffect(() => {
    const preventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // === 限制 date input 年份為 4 位 ===
  // 瀏覽器原生 date input 預設允許 6 位年份。
  // 我們對所有 date input 自動加 max="9999-12-31"，這樣使用者打到 5 位時瀏覽器會自動裁切。
  useEffect(() => {
    const applyDateLimits = () => {
      const inputs = document.querySelectorAll('input[type="date"]');
      inputs.forEach(input => {
        if (!input.hasAttribute('max')) input.setAttribute('max', '9999-12-31');
        if (!input.hasAttribute('min')) input.setAttribute('min', '1900-01-01');
      });
    };
    applyDateLimits();
    // 觀察 DOM 變動，對新增的 date input 也套用
    const observer = new MutationObserver(applyDateLimits);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // === Firestore 即時同步 ===
  useEffect(() => {
    if (!currentUser) return;

    const colRef = collection(db, PROJECTS_COL);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ ...d.data(), _docId: d.id }));
        // 過濾掉舊的測試文件（沒有 id 欄位的）
        const valid = docs.filter(d => d.id !== undefined && d.id !== null);
        valid.sort((a, b) => (a.id || 0) - (b.id || 0));

        // 第一次載入：如果雲端是空的，自動把 SEED_DATA 寫入
        if (valid.length === 0 && currentUser.role === 'admin') {
          SEED_DATA.forEach(p => {
            setDoc(doc(db, PROJECTS_COL, String(p.id)), p);
          });
          // SEED_DATA 寫入後 onSnapshot 會自動再觸發
        } else {
          setProjects(valid);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Firestore 同步錯誤:', error);
        setIsLoading(false);
        alert('連線雲端資料庫失敗：' + error.message);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // === 訂閱分類碼 / 特徵碼（首次空白會種子化）===
  useEffect(() => {
    if (!currentUser) return;
    const subscribe = (colName, defaults, setter, sortKey) => {
      const colRef = collection(db, colName);
      return onSnapshot(colRef, (snap) => {
        const items = snap.docs.map(d => ({ ...d.data(), _docId: d.id }));
        if (items.length === 0 && currentUser.role === 'admin') {
          // 種子化
          defaults.forEach(it => setDoc(doc(db, colName, it.code), it));
        } else if (items.length > 0) {
          // 依 order / code 排序
          items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.code.localeCompare(b.code));
          setter(items);
        }
      });
    };
    const u1 = subscribe(CATEGORY_COL, DEFAULT_CATEGORY_CODES.map((c, i) => ({ ...c, order: i })), setCategoryCodes);
    const u2 = subscribe(FEATURE_COL, DEFAULT_FEATURE_CODES.map((c, i) => ({ ...c, order: i })), setFeatureCodes);
    return () => { u1(); u2(); };
  }, [currentUser]);

  // 寫入單一 project 到 Firestore
  const saveProjectToCloud = async (project) => {
    setSaveStatus('saving');
    try {
      // 清掉所有 undefined 欄位（Firestore 不接受），避免儲存失敗
      const cleaned = {};
      Object.keys(project).forEach(k => {
        if (project[k] !== undefined) cleaned[k] = project[k];
      });
      await setDoc(doc(db, PROJECTS_COL, String(cleaned.id)), cleaned);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error('雲端儲存失敗:', e);
      setSaveStatus('idle');
      alert('雲端儲存失敗：' + e.message);
    }
  };

  // 從 Firestore 刪除
  const deleteProjectFromCloud = async (projectId, docId) => {
    try {
      // 用 docId 刪（如果有），否則用 id 字串
      await deleteDoc(doc(db, PROJECTS_COL, docId || String(projectId)));
    } catch (e) {
      console.error('雲端刪除失敗:', e);
      alert('雲端刪除失敗：' + e.message);
    }
  };

  const handleLogin = (user) => {
    try {
      sessionStorage.setItem('comart_roadmap_user', JSON.stringify(user));
    } catch (e) {}
    // 重新整理頁面確保資料正確載入（修復登入後空白 bug）
    window.location.reload();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('comart_roadmap_user');
    } catch (e) {}
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [tagFilter, setTagFilter] = useState('全部');
  const [phaseFilter, setPhaseFilter] = useState('全部');
  const [selectedProject, setSelectedProject] = useState(null);
  const [autoOpenCodeWizard, setAutoOpenCodeWizard] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPrototypeOverview, setShowPrototypeOverview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  // 登入前畫面（移到所有 hook 之後才能 return）
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === 'admin';
  const isViewer = currentUser.role === 'viewer';
  const fileInputRef = useRef(null);

  const allTags = useMemo(() => {
    const set = new Set();
    projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === '全部' || p.status === statusFilter;
      const matchTag = tagFilter === '全部' || (p.tags || []).includes(tagFilter);
      const matchPhase = phaseFilter === '全部' || getCurrentPhase(p) === phaseFilter;
      return matchSearch && matchStatus && matchTag && matchPhase;
    }).sort((a, b) => {
      // 依 sortOrder 排序，沒有的補 999999（放後面）
      const oa = a.sortOrder ?? 999999;
      const ob = b.sortOrder ?? 999999;
      if (oa !== ob) return oa - ob;
      // sortOrder 相同就依 id 排（保持穩定）
      return (a.id || 0) - (b.id || 0);
    });
  }, [projects, searchTerm, statusFilter, tagFilter, phaseFilter]);

  // 重新排序所有產品的 sortOrder（用 10/20/30 留間隔）
  const reorderProjects = async (newOrderList) => {
    if (!isAdmin) return;
    const updates = newOrderList.map((p, i) => ({ ...p, sortOrder: (i + 1) * 10 }));
    // 批次寫入 Firestore
    for (const p of updates) {
      const cleaned = {};
      Object.keys(p).forEach(k => { if (p[k] !== undefined && k !== '_docId') cleaned[k] = p[k]; });
      await setDoc(doc(db, PROJECTS_COL, String(p.id)), cleaned);
    }
  };

  // 拖曳狀態
  const [dragProjectId, setDragProjectId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  // 處理拖曳放開
  const handleProjectDrop = (targetId) => {
    if (!dragProjectId || dragProjectId === targetId) {
      setDragProjectId(null);
      setDropTargetId(null);
      return;
    }
    // 用「目前篩選後的順序」當基準（拖曳必須在當前可見的清單裡進行）
    const visibleList = filteredProjects;
    const dragIdx = visibleList.findIndex(p => p.id === dragProjectId);
    const targetIdx = visibleList.findIndex(p => p.id === targetId);
    if (dragIdx < 0 || targetIdx < 0) {
      setDragProjectId(null);
      setDropTargetId(null);
      return;
    }
    // 建立新順序
    const newVisible = [...visibleList];
    const [moved] = newVisible.splice(dragIdx, 1);
    newVisible.splice(targetIdx, 0, moved);
    // 重新計算全部產品的 sortOrder（保留不在可見清單裡的相對位置）
    const visibleIds = new Set(newVisible.map(p => p.id));
    const hiddenProjects = projects.filter(p => !visibleIds.has(p.id));
    // 可見的依新順序、隱藏的接在後面（保留原順序）
    const allReordered = [...newVisible, ...hiddenProjects.sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999))];
    reorderProjects(allReordered);
    setDragProjectId(null);
    setDropTargetId(null);
  };

  const counts = useMemo(() => {
    const c = { 全部: projects.length };
    STATUS_OPTIONS.forEach(s => { c[s] = projects.filter(p => p.status === s).length; });
    return c;
  }, [projects]);

  const handleSaveProject = (project) => {
    if (!isAdmin) return; // viewer 不能寫
    let toSave = project;
    if (!project.id) {
      const newId = Math.max(0, ...projects.map(p => p.id || 0)) + 1;
      toSave = { ...project, id: newId };
    }
    saveProjectToCloud(toSave);
    setShowNewModal(false);
  };

  const handleAddUpdate = (projectId, update) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === projectId);
    if (!target) return;
    const updated = { ...target, updates: [update, ...(target.updates || [])] };
    saveProjectToCloud(updated);
    setSelectedProject(prev => prev && prev.id === projectId ? updated : prev);
  };

  const handleEditUpdate = (projectId, idx, newUpdate) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === projectId);
    if (!target) return;
    const updates = [...(target.updates || [])];
    updates[idx] = newUpdate;
    const updated = { ...target, updates };
    saveProjectToCloud(updated);
    setSelectedProject(prev => prev && prev.id === projectId ? updated : prev);
  };

  const handleDeleteUpdate = (projectId, idx) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === projectId);
    if (!target) return;
    const updates = (target.updates || []).filter((_, i) => i !== idx);
    const updated = { ...target, updates };
    saveProjectToCloud(updated);
    setSelectedProject(prev => prev && prev.id === projectId ? updated : prev);
  };

  const handleUpdateProjectField = (projectId, field, value) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === projectId);
    if (!target) return;
    const updated = { ...target, [field]: value };
    // 若改了料號，自動更新類別（除非使用者明確設定過獨立的類別文字）
    // 規則：若舊類別是空、或者舊類別正好等於舊料號推算的類別 → 同步更新
    if (field === 'code') {
      const oldDerived = deriveCategoryFromCode(target.code);
      const newDerived = deriveCategoryFromCode(value);
      if (!target.category || target.category === oldDerived) {
        updated.category = newDerived;
      }
    }
    saveProjectToCloud(updated);
    setSelectedProject(prev => prev && prev.id === projectId ? updated : prev);
  };

  const handleToggleStage = (projectId, stage) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === projectId);
    if (!target) return;
    const updated = { ...target, stages: { ...target.stages, [stage]: !target.stages?.[stage] } };
    saveProjectToCloud(updated);
    setSelectedProject(prev => prev && prev.id === projectId ? updated : prev);
  };

  // 從所有專案中移除某個標籤
  const handleDeleteTag = (tagToRemove) => {
    if (!isAdmin) return;
    const affectedProjects = projects.filter(p => (p.tags || []).includes(tagToRemove));
    affectedProjects.forEach(p => {
      const updated = { ...p, tags: (p.tags || []).filter(t => t !== tagToRemove) };
      saveProjectToCloud(updated);
    });
    if (tagFilter === tagToRemove) setTagFilter('全部');
  };

  const handleDelete = (id) => {
    if (!isAdmin) return;
    const target = projects.find(p => p.id === id);
    deleteProjectFromCloud(id, target?._docId);
    setConfirmDelete(null);
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  // 複製產品：保留所有設定，但清空專屬資料
  const handleDuplicate = (project) => {
    if (!isAdmin) return;
    const newId = Date.now();
    const dup = {
      ...project,
      id: newId,
      // 只清空料號 + 改品名 + 改開案日
      code: '',                    // 料號清空（必須重新編碼）
      name: project.name + ' (副本)', // 品名加副本
      openDate: new Date().toISOString().split('T')[0],  // 開案日改今天
      // 全部保留（使用者要自己刪不需要的）：
      updates: project.updates || [],
      prototypeOrders: project.prototypeOrders || [],
      mouldOrders: project.mouldOrders || [],
      trialRuns: project.trialRuns || [],
      materialCodeStatus: project.materialCodeStatus || '未申請',
      materialCodeNumber: project.materialCodeNumber || '',
      phaseOverride: project.phaseOverride || null,
      status: project.status || '設計中',
      emailSubjects: project.emailSubjects || [],
      emailSubject: project.emailSubject || '',
      productImages: project.productImages || [],
      designs: project.designs || { ID: [], '3D': [], BOM: [] },
      hasDFM: project.hasDFM || false,
      dfmNotes: project.dfmNotes || '',
      dfmAttachments: project.dfmAttachments || [],
      tags: project.tags || [],
      trialNotes: project.trialNotes || '',
      notes: project.notes || '',
    };
    // 必須移除 _docId（Firestore 不接受 undefined，且新副本要存到新文件）
    delete dup._docId;
    saveProjectToCloud(dup);
    // 切換到新副本的詳細頁，並自動打開編碼精靈
    setTimeout(() => {
      setSelectedProject({ ...dup });
      setAutoOpenCodeWizard(true);
    }, 300);
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `產品進度_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['品名', '料號', '狀態', '供應商', 'ID設計', '3D設計', '開案日', '類別', '標籤', 'ID版本', '3D版本', 'BOM版本', 'DFM', '手板訂單數', '手板總額', '模具訂單數', '模具總額', '試模進度', '料號狀態', '最新進度日期', '最新進度', '備註'];
    const rows = projects.map(p => {
      const latest = p.updates?.[0];
      const idLatest = p.designs?.ID?.[0]?.version || '';
      const threeDLatest = p.designs?.['3D']?.[0]?.version || '';
      const bomLatest = p.designs?.BOM?.[0]?.version || '';
      const protoCount = (p.prototypeOrders || []).length;
      const protoTotal = (p.prototypeOrders || []).reduce((s, o) => s + (Number(o.quantity || 0) * Number(o.unitPrice || 0)), 0);
      const mouldCount = (p.mouldOrders || []).length;
      const mouldTotal = (p.mouldOrders || []).reduce((s, o) => s + (Number(o.quantity || 0) * Number(o.unitPrice || 0)), 0);
      const trialLatest = (p.trialRuns || []).length > 0 ? p.trialRuns[p.trialRuns.length - 1].round : '';
      return [
        p.name, p.code, p.status, p.supplier, p.idDesigner, p.threeDDesigner,
        p.openDate, p.category, (p.tags || []).join(' '),
        idLatest, threeDLatest, bomLatest,
        p.hasDFM ? '有' : '無',
        protoCount, protoTotal, mouldCount, mouldTotal,
        trialLatest, p.materialCodeStatus || '未申請',
        latest?.date || '', latest?.text || '', p.notes
      ].map(v => `"${(v || v === 0 ? v : '').toString().replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `產品進度_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          if (!isAdmin) {
            alert('只有管理員可以匯入資料');
            return;
          }
          if (!confirm(`即將匯入 ${data.length} 筆專案到雲端，會覆蓋現有資料。確定？`)) return;
          // 批次寫入 Firestore
          data.forEach(p => {
            if (p.id !== undefined && p.id !== null) {
              setDoc(doc(db, PROJECTS_COL, String(p.id)), p);
            }
          });
          alert(`已匯入 ${data.length} 筆專案到雲端`);
        }
      } catch (err) {
        alert('匯入失敗：檔案格式錯誤');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={COMART_LOGO_BASE64}
              alt="COMART"
              className="h-5 sm:h-6 w-auto flex-shrink-0"
            />
            <div className="min-w-0 border-l border-slate-200 pl-3 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-medium truncate">產品進度管理</h1>
                <button
                  onClick={() => setShowVersionHistory(true)}
                  title="版本歷史"
                  className="text-[10px] text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono transition"
                >
                  {APP_VERSION}
                </button>
              </div>
              <p className="text-xs text-slate-500">怡業股份有限公司 · Roadmap</p>
            </div>
            <button
              onClick={() => setShowVersionHistory(true)}
              className="sm:hidden text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono"
            >
              {APP_VERSION}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <SaveStatusIndicator status={saveStatus} />
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
              <span>{currentUser.name}</span>
              <span className={`text-[9px] px-1 rounded font-medium ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                {isAdmin ? '管理員' : '檢視'}
              </span>
            </div>
            <button onClick={handleLogout} title="登出" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} title="匯入 JSON" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowPrototypeOverview(true)}
              title="手板總覽（跨產品）"
              className="p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 rounded-lg inline-flex items-center gap-1"
            >
              <span>📦</span>
              <span className="hidden sm:inline text-xs">手板</span>
            </button>
            <div className="relative group">
              <button title="匯出" className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <Download className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg w-32 hidden group-hover:block z-20">
                <button onClick={exportCSV} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-t-lg">CSV (Excel)</button>
                <button onClick={exportJSON} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 rounded-b-lg">JSON (備份)</button>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-1.5 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-slate-800"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新增</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">載入雲端資料中...</p>
          </div>
        )}
        {!isLoading && (
        <>
        <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋品名、料號、供應商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
            {/* 產品階段篩選（依當前階段篩選） */}
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              title="依產品階段篩選"
            >
              <option value="全部">全部階段</option>
              {PHASE_DEFINITIONS.map(p => (
                <option key={p.key} value={p.key}>{p.label} · {p.subtitle}</option>
              ))}
            </select>

            {allTags.length > 0 && (
              <div className="flex gap-1">
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="全部">全部標籤</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {isAdmin && (
                  <button
                    onClick={() => setShowTagManager(true)}
                    title="管理標籤"
                    className="px-2 py-2 text-slate-500 hover:bg-slate-100 rounded-lg border border-slate-200"
                  >
                    <Tag className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1">
            {['全部', ...STATUS_OPTIONS].map(s => {
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s !== '全部' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[s]} ${active ? 'opacity-90' : ''}`}></span>}
                  <span>{s}</span>
                  <span className={`text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{counts[s] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-400 text-sm">沒有符合條件的專案</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map(p => (
              <ProjectRow
                key={p.id}
                project={p}
                onClick={() => setSelectedProject(p)}
                draggable={isAdmin}
                isDragging={dragProjectId === p.id}
                isDropTarget={dropTargetId === p.id && dragProjectId !== p.id}
                onDragStart={() => setDragProjectId(p.id)}
                onDragOver={() => setDropTargetId(p.id)}
                onDragLeave={() => setDropTargetId(prev => prev === p.id ? null : prev)}
                onDrop={() => handleProjectDrop(p.id)}
                onDragEnd={() => { setDragProjectId(null); setDropTargetId(null); }}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {selectedProject && (
        <ProjectDetail
          project={selectedProject}
          allTags={allTags}
          isViewer={isViewer}
          onClose={() => setSelectedProject(null)}
          onAddUpdate={(u) => handleAddUpdate(selectedProject.id, u)}
          onEditUpdate={(idx, u) => handleEditUpdate(selectedProject.id, idx, u)}
          onDeleteUpdate={(idx) => handleDeleteUpdate(selectedProject.id, idx)}
          onUpdateField={(field, value) => handleUpdateProjectField(selectedProject.id, field, value)}
          onToggleStage={(stage) => handleToggleStage(selectedProject.id, stage)}
          onDelete={() => setConfirmDelete(selectedProject.id)}
          onDuplicate={() => handleDuplicate(selectedProject)}
          autoOpenWizard={autoOpenCodeWizard}
          onWizardClose={() => setAutoOpenCodeWizard(false)}
          existingCodes={projects.filter(p => p.id !== selectedProject.id).map(p => p.code).filter(Boolean)}
          categoryCodes={categoryCodes}
          featureCodes={featureCodes}
        />
      )}

      {showNewModal && (
        <NewProjectModal
          onSave={handleSaveProject}
          onClose={() => setShowNewModal(false)}
          existingCodes={projects.map(p => p.code).filter(Boolean)}
          categoryCodes={categoryCodes}
          featureCodes={featureCodes}
        />
      )}

      {showPrototypeOverview && (
        <PrototypeOverviewModal
          projects={projects}
          onClose={() => setShowPrototypeOverview(false)}
          onJumpToProject={(id) => {
            const target = projects.find(p => p.id === id);
            if (target) {
              setSelectedProject(target);
              setShowPrototypeOverview(false);
            }
          }}
        />
      )}

      {confirmDelete !== null && (
        <ConfirmDialog
          message="確定要刪除此專案嗎？所有更新紀錄都會一併刪除，此操作無法復原。"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryModal onClose={() => setShowVersionHistory(false)} />
      )}

      {showTagManager && (
        <TagManagerModal
          allTags={allTags}
          projects={projects}
          onDelete={handleDeleteTag}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}

// 根據資料自動判斷目前階段
function computeAutoPhase(project) {
  // MP：料號已申請
  if (project.materialCodeStatus === '已申請') return 'MP';

  // PVT：試模或料號申請中（T1~T4 都算試產）
  const trialRounds = (project.trialRuns || []).map(r => r.round);
  if (project.materialCodeStatus === '申請中') return 'PVT';
  if (trialRounds.length > 0) return 'PVT';

  // DVT：DFM 完成（DFA/DFM 設計驗證）
  if (project.hasDFM && (project.dfmNotes || (project.dfmAttachments || []).length > 0)) return 'DVT';

  // EVT：有手板（工程驗證）
  if ((project.prototypeOrders || []).length > 0) return 'EVT';

  // 規劃：尚未開始手板
  return '規劃';
}

// 取得實際階段（手動覆蓋優先）
function getCurrentPhase(project) {
  if (project.phaseOverride) return project.phaseOverride;
  return computeAutoPhase(project);
}

// 取得階段內的詳細子進度文字
function getPhaseDetail(project) {
  const phase = getCurrentPhase(project);

  if (phase === '規劃') {
    const idCount = project.designs?.ID?.length || 0;
    const td = project.designs?.['3D']?.length || 0;
    const bom = project.designs?.BOM?.length || 0;
    if (idCount > 0 && td > 0 && bom > 0) return 'BOM 完成';
    if (idCount > 0 && td > 0) return '3D 完成';
    if (idCount > 0) return 'ID 完成';
    if (td > 0) return '3D 進行中';
    return '尚未開始';
  }

  if (phase === 'EVT') {
    const orders = project.prototypeOrders || [];
    const received = orders.filter(o => o.status === '已收到').length;
    return `手板 ${received}/${orders.length} 已收到`;
  }

  if (phase === 'DVT') {
    if (project.hasDFM) return 'DFM 進行中';
    return '進行中';
  }

  if (phase === 'PVT') {
    const trials = project.trialRuns || [];
    if (trials.length > 0) {
      const last = trials[trials.length - 1];
      return `${last.round} 完成`;
    }
    if ((project.mouldOrders || []).length > 0) return '模具下訂';
    if (project.materialCodeStatus === '申請中') return '料號申請中';
    return '試產中';
  }

  if (phase === 'MP') return '已量產';

  return '';
}

function ProjectRow({ project, onClick, draggable = false, isDragging = false, isDropTarget = false, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd }) {
  const latest = project.updates?.[0];
  const cfg = STATUS_COLORS[project.status];

  const mainImage = project.productImages?.[0];
  const currentPhase = getCurrentPhase(project);
  const phaseDetail = getPhaseDetail(project);
  const phaseColor = PHASE_COLORS[currentPhase];
  const isOverridden = !!project.phaseOverride;

  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = 'move';
        // 不要傳遞檔案資料，這是內部排序拖曳
        e.dataTransfer.setData('text/plain', 'reorder');
        if (onDragStart) onDragStart();
      }}
      onDragOver={(e) => {
        if (!draggable) return;
        e.preventDefault();
        if (onDragOver) onDragOver();
      }}
      onDragLeave={(e) => {
        if (!draggable) return;
        if (onDragLeave) onDragLeave();
      }}
      onDrop={(e) => {
        if (!draggable) return;
        e.preventDefault();
        if (onDrop) onDrop();
      }}
      onDragEnd={() => {
        if (onDragEnd) onDragEnd();
      }}
      className={`transition ${isDragging ? 'opacity-30' : ''} ${isDropTarget ? 'ring-2 ring-blue-400 ring-offset-1 rounded-xl' : ''}`}
    >
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition group ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
          {mainImage ? (
            <StorageImage
              src={mainImage.url || mainImage.dataUrl}
              path={mainImage.path}
              alt={project.name}
              className="w-full h-full object-contain"
              style={mainImage.fit === 'cover' ? { objectFit: 'cover' } : undefined}
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-slate-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-medium text-slate-900 line-clamp-1">{project.name}</h3>
                {project.code && <span className="text-xs text-slate-400">{project.code}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded border ${cfg}`}>{project.status}</span>
                {project.supplier && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                    {project.supplier}
                  </span>
                )}
                {(project.tags || []).map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-slate-400 mb-0.5 flex items-center justify-end gap-1">
                目前階段
                {isOverridden && <span className="text-[9px] text-amber-600" title="已手動覆蓋">●</span>}
              </p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${phaseColor.bg} ${phaseColor.text} ${phaseColor.border}`}>
                {currentPhase}
              </span>
            </div>
          </div>

          {latest && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs text-blue-600 font-medium tabular-nums flex-shrink-0">
                  {latest.date}
                </span>
                <span className="text-xs text-slate-400">最新進度</span>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{latest.text}</p>
              {project.updates.length > 1 && (
                <p className="text-xs text-slate-400 mt-1.5">+ {project.updates.length - 1} 筆歷史紀錄</p>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
    </div>
  );
}

function ProjectDetail({ project, allTags, isViewer, onClose, onAddUpdate, onEditUpdate, onDeleteUpdate, onUpdateField, onToggleStage, onDelete, onDuplicate, autoOpenWizard, onWizardClose, existingCodes = [], categoryCodes = DEFAULT_CATEGORY_CODES, featureCodes = DEFAULT_FEATURE_CODES }) {
  const [showWizard, setShowWizard] = useState(false);

  // 收到自動打開請求時，跳出精靈
  useEffect(() => {
    if (autoOpenWizard) {
      setShowWizard(true);
    }
  }, [autoOpenWizard]);

  const closeWizard = () => {
    setShowWizard(false);
    if (onWizardClose) onWizardClose();
  };
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingUpdateIdx, setEditingUpdateIdx] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');
  const [newTag, setNewTag] = useState('');
  const cfg = STATUS_COLORS[project.status];

  const updates = project.updates || [];
  const latest = updates[0];
  const history = updates.slice(1);

  const startEditField = (field, currentValue) => {
    setEditingField(field);
    setTempValue(currentValue || '');
  };

  const saveField = () => {
    // 料號重複偵測：如果新值已存在於其他產品，警告但仍儲存（讓使用者決定）
    if (editingField === 'code' && tempValue && tempValue !== project.code) {
      if (isCodeDuplicate(tempValue, existingCodes)) {
        if (!confirm(`料號「${tempValue}」已被其他產品使用。\n\n仍要儲存嗎？`)) {
          setEditingField(null);
          return;
        }
      }
    }
    onUpdateField(editingField, tempValue);
    setEditingField(null);
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    let tag = newTag.trim();
    if (!tag.startsWith('#')) tag = '#' + tag;
    if (!(project.tags || []).includes(tag)) {
      onUpdateField('tags', [...(project.tags || []), tag]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (tag) => {
    onUpdateField('tags', (project.tags || []).filter(t => t !== tag));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-40 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-3xl sm:rounded-xl min-h-screen sm:min-h-0 sm:max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex-1 min-w-0 pr-3">
            {editingField === 'name' ? (
              <input
                type="text"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={saveField}
                onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditingField(null); }}
                autoFocus
                className="w-full text-base font-medium border border-slate-300 rounded px-2 py-1"
              />
            ) : (
              <h2
                className="text-base font-medium leading-snug cursor-text hover:bg-slate-50 -mx-2 px-2 py-1 rounded"
                onClick={() => startEditField('name', project.name)}
              >
                {project.name}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <select
                value={project.status}
                onChange={(e) => onUpdateField('status', e.target.value)}
                className={`text-xs px-2 py-0.5 rounded border cursor-pointer ${cfg}`}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {editingField === 'code' ? (
                <div className="inline-flex flex-col">
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value.toUpperCase())}
                    onBlur={saveField}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditingField(null); }}
                    autoFocus
                    placeholder="料號"
                    className={`text-xs border rounded px-2 py-0.5 w-36 font-mono ${
                      tempValue && tempValue !== project.code && isCodeDuplicate(tempValue, existingCodes)
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-slate-300'
                    }`}
                  />
                  {tempValue && tempValue !== project.code && isCodeDuplicate(tempValue, existingCodes) && (
                    <span className="text-[10px] text-rose-600 mt-0.5">⚠ 此料號已存在</span>
                  )}
                </div>
              ) : (
                <span
                  onClick={() => startEditField('code', project.code)}
                  className="text-xs text-slate-500 cursor-text hover:bg-slate-100 px-1 py-0.5 rounded font-mono"
                >
                  {project.code || '+ 料號'}
                </span>
              )}
              {!isViewer && (
                <button
                  onClick={() => setShowWizard(true)}
                  title="用編碼精靈產生料號"
                  className="text-[11px] text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"
                >
                  <span>✨</span><span className="hidden sm:inline">編碼精靈</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isViewer && onDuplicate && (
              <button
                onClick={() => {
                  if (confirm(`確定要複製「${project.name}」嗎？\n會建立一個新專案，所有資料（圖片、版本、進度、訂單等）都會複製過去，只有料號需要重新編碼。`)) {
                    onDuplicate();
                  }
                }}
                title="複製此專案（建立新副本）"
                className="p-1.5 hover:bg-blue-50 rounded text-slate-400 hover:text-blue-600 inline-flex items-center gap-1 text-xs px-2"
              >
                <span>📋</span>
                <span className="hidden sm:inline">複製</span>
              </button>
            )}
            <button onClick={onDelete} title="刪除專案" className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
              <InfoField label="供應商" value={project.supplier} onSave={(v) => onUpdateField('supplier', v)} />
              <InfoField label="ID 設計" value={project.idDesigner} onSave={(v) => onUpdateField('idDesigner', v)} />
              <InfoField label="3D 設計" value={project.threeDDesigner} onSave={(v) => onUpdateField('threeDDesigner', v)} />
              <InfoField
                label="類別"
                value={project.category || deriveCategoryFromCode(project.code)}
                placeholder={deriveCategoryFromCode(project.code) ? '依料號自動帶入' : ''}
                onSave={(v) => onUpdateField('category', v)}
              />
              <InfoField label="開案日" value={project.openDate} type="date" onSave={(v) => onUpdateField('openDate', v)} />
            </div>
          </section>

          <EmailSubjectSection
            project={project}
            onChange={(v) => onUpdateField('emailSubjects', v)}
          />

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide">標籤</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {(project.tags || []).map(t => (
                <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200">
                  {t}
                  <button onClick={() => handleRemoveTag(t)} className="hover:text-violet-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                  placeholder="+ 新增標籤"
                  list="all-tags"
                  className="text-xs px-2 py-1 border border-slate-200 rounded w-28 focus:outline-none focus:border-slate-400"
                />
                <datalist id="all-tags">
                  {allTags.map(t => <option key={t} value={t} />)}
                </datalist>
                {newTag && (
                  <button onClick={handleAddTag} className="text-xs text-blue-600 hover:underline">加入</button>
                )}
              </div>
            </div>
          </section>

          <ProductImagesSection
            images={project.productImages || []}
            onChange={(imgs) => onUpdateField('productImages', imgs)}
          />

          <PhaseTimeline
            project={project}
            onOverride={(phase) => onUpdateField('phaseOverride', phase)}
          />


          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide">進度紀錄</h3>
              <button
                onClick={() => setShowAddUpdate(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-3 h-3" />
                新增更新
              </button>
            </div>

            {showAddUpdate && (
              <UpdateForm
                onCancel={() => setShowAddUpdate(false)}
                onSave={(u) => { onAddUpdate(u); setShowAddUpdate(false); }}
              />
            )}

            {updates.length === 0 && !showAddUpdate ? (
              <p className="text-sm text-slate-400 py-4 text-center bg-slate-50 rounded-lg">尚無更新紀錄</p>
            ) : (
              <div className="space-y-2.5">
                {latest && (
                  <UpdateCard
                    update={latest}
                    isLatest
                    isEditing={editingUpdateIdx === 0}
                    onStartEdit={() => setEditingUpdateIdx(0)}
                    onCancelEdit={() => setEditingUpdateIdx(null)}
                    onSave={(u) => { onEditUpdate(0, u); setEditingUpdateIdx(null); }}
                    onDelete={() => onDeleteUpdate(0)}
                  />
                )}

                {history.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
                  >
                    {showHistory ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    歷史紀錄 ({history.length})
                  </button>
                )}

                {showHistory && history.map((u, i) => (
                  <UpdateCard
                    key={i}
                    update={u}
                    isLatest={false}
                    isEditing={editingUpdateIdx === i + 1}
                    onStartEdit={() => setEditingUpdateIdx(i + 1)}
                    onCancelEdit={() => setEditingUpdateIdx(null)}
                    onSave={(updated) => { onEditUpdate(i + 1, updated); setEditingUpdateIdx(null); }}
                    onDelete={() => onDeleteUpdate(i + 1)}
                  />
                ))}
              </div>
            )}
          </section>
          <DesignSection
            designs={project.designs || { ID: [], '3D': [], BOM: [] }}
            onChange={(d) => onUpdateField('designs', d)}
          />

          <DFMSection
            hasDFM={project.hasDFM || false}
            dfmNotes={project.dfmNotes || ''}
            dfmAttachments={project.dfmAttachments || []}
            onToggle={(v) => onUpdateField('hasDFM', v)}
            onNotesChange={(v) => onUpdateField('dfmNotes', v)}
            onAttachmentsChange={(v) => onUpdateField('dfmAttachments', v)}
          />

          <PrototypeSection
            orders={project.prototypeOrders || []}
            onChange={(o) => onUpdateField('prototypeOrders', o)}
            defaultSupplier={project.supplier}
            readOnly={isViewer}
            designs={project.designs}
          />

          <MouldSection
            orders={project.mouldOrders || []}
            onChange={(o) => onUpdateField('mouldOrders', o)}
            defaultSupplier={project.supplier}
            readOnly={isViewer}
          />

          <TrialSection
            trialRuns={project.trialRuns || []}
            trialNotes={project.trialNotes || ''}
            onChangeRuns={(r) => onUpdateField('trialRuns', r)}
            onChangeNotes={(v) => onUpdateField('trialNotes', v)}
          />

          <MaterialCodeSection
            status={project.materialCodeStatus || '未申請'}
            materialCode={project.materialCodeNumber || ''}
            onChange={(v) => onUpdateField('materialCodeStatus', v)}
            onCodeChange={(v) => onUpdateField('materialCodeNumber', v)}
          />


          <section>
            <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide mb-2">備註 / 特色</h3>
            {editingField === 'notes' ? (
              <div>
                <textarea
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveField} className="text-xs px-3 py-1 bg-slate-900 text-white rounded">儲存</button>
                  <button onClick={() => setEditingField(null)} className="text-xs px-3 py-1 hover:bg-slate-100 rounded">取消</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => startEditField('notes', project.notes)}
                className="text-sm text-slate-700 leading-relaxed cursor-text hover:bg-slate-50 px-3 py-2 -mx-3 rounded-lg whitespace-pre-wrap min-h-[2.5rem]"
              >
                {project.notes || <span className="text-slate-400">點擊新增備註...</span>}
              </div>
            )}
          </section>
        </div>
      </div>

      {showWizard && (
        <ProductCodeWizard
          existingCodes={existingCodes}
          categoryCodes={categoryCodes}
          featureCodes={featureCodes}
          onApply={(code) => {
            onUpdateField('code', code);
            closeWizard();
          }}
          onClose={closeWizard}
        />
      )}
    </div>
  );
}

// 兼容舊版單字串 emailSubject 與新的 emailSubjects 陣列
function normalizeEmailSubjects(project) {
  if (Array.isArray(project.emailSubjects)) return project.emailSubjects;
  if (project.emailSubject) {
    return [{ kind: '其他', subject: project.emailSubject }];
  }
  return [];
}

function EmailSubjectSection({ project, onChange }) {
  const subjects = normalizeEmailSubjects(project);
  const [adding, setAdding] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [tempKind, setTempKind] = useState('內部');
  const [tempSubject, setTempSubject] = useState('');

  const buildSearchUrl = (s) => `https://outlook.office.com/mail/inbox/?search=${encodeURIComponent(s)}`;

  const KIND_STYLES = {
    '內部': 'bg-blue-50 text-blue-700 border-blue-200',
    '客戶': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    '其他': 'bg-slate-50 text-slate-600 border-slate-200',
  };
  const KIND_OPTIONS = ['內部', '客戶', '其他'];

  const startAdd = () => {
    setTempKind('內部'); setTempSubject(''); setAdding(true); setEditIdx(null);
  };
  const startEdit = (idx) => {
    setTempKind(subjects[idx].kind); setTempSubject(subjects[idx].subject); setEditIdx(idx); setAdding(false);
  };
  const cancel = () => {
    setAdding(false); setEditIdx(null); setTempSubject(''); setTempKind('內部');
  };
  const commitNew = () => {
    if (!tempSubject.trim()) return;
    onChange([...subjects, { kind: tempKind, subject: tempSubject.trim() }]);
    cancel();
  };
  const commitEdit = () => {
    if (!tempSubject.trim()) return;
    const updated = [...subjects];
    updated[editIdx] = { kind: tempKind, subject: tempSubject.trim() };
    onChange(updated);
    cancel();
  };
  const remove = (idx) => {
    onChange(subjects.filter((_, i) => i !== idx));
  };

  const renderForm = (onCommit) => (
    <div className="bg-blue-50/40 border border-blue-200 rounded p-2 space-y-1.5">
      <div className="flex gap-1">
        {KIND_OPTIONS.map(k => (
          <button
            key={k}
            type="button"
            onClick={() => setTempKind(k)}
            className={`text-[11px] px-2 py-0.5 rounded border ${
              tempKind === k ? KIND_STYLES[k] + ' font-medium' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={tempSubject}
        onChange={(e) => setTempSubject(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') cancel(); }}
        autoFocus
        placeholder="例：COMART_CMMS0007_球頭規格確認"
        className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
      />
      <div className="flex justify-end gap-1.5">
        <button onClick={cancel} className="text-[11px] px-2 py-0.5 hover:bg-white rounded">取消</button>
        <button onClick={onCommit} disabled={!tempSubject.trim()} className="text-[11px] px-2 py-0.5 bg-slate-900 text-white rounded disabled:opacity-40">儲存</button>
      </div>
    </div>
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide">📧 郵件主旨</h3>
        {!adding && editIdx === null && (
          <button onClick={startAdd} className="text-[11px] text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <Plus className="w-3 h-3" />新增主旨
          </button>
        )}
      </div>

      {subjects.length === 0 && !adding ? (
        <div className="text-xs text-slate-400 py-2 px-3 bg-slate-50 rounded border border-slate-200">
          還沒新增任何郵件主旨。點「新增主旨」可區分內部 / 客戶郵件。
        </div>
      ) : (
        <ul className="space-y-1.5">
          {subjects.map((s, i) => (
            <li key={i}>
              {editIdx === i ? renderForm(commitEdit) : (
                <div className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5 group">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${KIND_STYLES[s.kind] || KIND_STYLES['其他']}`}>
                    {s.kind}
                  </span>
                  <span className="text-xs text-slate-700 flex-1 min-w-0 truncate" title={s.subject}>{s.subject}</span>
                  <a
                    href={buildSearchUrl(s.subject)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="在 Outlook 搜尋"
                    className="text-[11px] text-blue-600 hover:bg-blue-100 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 flex-shrink-0"
                  >
                    🔍 搜尋
                  </a>
                  <button onClick={() => startEdit(i)} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-slate-400 hover:text-slate-700 flex-shrink-0">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => remove(i)} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-slate-400 hover:text-rose-600 flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && <div className="mt-1.5">{renderForm(commitNew)}</div>}
    </section>
  );
}

function InfoField({ label, value, type = 'text', onSave, placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || '');

  const start = () => { setTemp(value || ''); setEditing(true); };
  const commit = () => { onSave(temp); setEditing(false); };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        {placeholder && !editing && <span className="text-[9px] text-slate-400">{placeholder}</span>}
      </div>
      {editing ? (
        <input
          type={type}
          value={temp}
          onChange={(e) => setTemp(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          autoFocus
          className="text-sm w-full border border-slate-300 rounded px-2 py-0.5"
        />
      ) : (
        <p
          onClick={start}
          className="text-sm text-slate-800 cursor-text hover:bg-slate-50 -mx-1 px-1 py-0.5 rounded min-h-[1.5rem]"
        >
          {value || <span className="text-slate-400">—</span>}
        </p>
      )}
    </div>
  );
}

// 圖片上傳前的簡單裁剪/區域選取 Modal
// 智慧圖片元件：如果 URL 過期，自動用 path 重新取得 URL
function StorageImage({ src, path, alt, className, onClick, style }) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retrying, setRetrying] = useState(false);

  // 當 src 變更時更新
  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const handleError = async () => {
    if (retrying || !path) return; // 無 path 無法重試
    setRetrying(true);
    try {
      const newUrl = await getDownloadURL(storageRef(storage, path));
      setCurrentSrc(newUrl);
    } catch (e) {
      console.warn('Storage image refresh failed:', path, e.message);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={handleError}
      style={style}
    />
  );
}

function ImageCropModal({ file, onConfirm, onCancel }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState(null); // { x, y, w, h } 顯示座標
  const [dragging, setDragging] = useState(null); // 'new', 'move', 'tl', 'tr', 'bl', 'br'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, crop: null });
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setImgSrc(e.target.result);
    reader.readAsDataURL(file);
  }, [file]);

  const handleImgLoad = (e) => {
    const img = e.target;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    // 預設裁切框 = 整張圖
    const rect = img.getBoundingClientRect();
    setCrop({ x: 0, y: 0, w: rect.width, h: rect.height });
  };

  const getRelativePos = (e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getRelativePos(e);
    setDragging(mode);
    setDragStart({ ...pos, crop: { ...crop } });
  };

  const handleNewBoxStart = (e) => {
    if (!imgRef.current) return;
    const pos = getRelativePos(e);
    setDragging('new');
    setDragStart({ ...pos, crop: { x: pos.x, y: pos.y, w: 0, h: 0 } });
    setCrop({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getRelativePos(e);
    const rect = imgRef.current.getBoundingClientRect();
    const maxW = rect.width;
    const maxH = rect.height;

    if (dragging === 'new') {
      const x = Math.min(dragStart.x, pos.x);
      const y = Math.min(dragStart.y, pos.y);
      const w = Math.abs(pos.x - dragStart.x);
      const h = Math.abs(pos.y - dragStart.y);
      setCrop({ x, y, w, h });
    } else if (dragging === 'move') {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      const newX = Math.max(0, Math.min(maxW - dragStart.crop.w, dragStart.crop.x + dx));
      const newY = Math.max(0, Math.min(maxH - dragStart.crop.h, dragStart.crop.y + dy));
      setCrop({ ...crop, x: newX, y: newY });
    } else {
      // resize
      const c = { ...dragStart.crop };
      let nx = c.x, ny = c.y, nw = c.w, nh = c.h;
      if (dragging.includes('l')) {
        const dx = pos.x - c.x;
        nx = Math.max(0, Math.min(c.x + c.w - 20, c.x + dx));
        nw = c.w - (nx - c.x);
      }
      if (dragging.includes('r')) {
        nw = Math.max(20, Math.min(maxW - c.x, pos.x - c.x));
      }
      if (dragging.includes('t')) {
        const dy = pos.y - c.y;
        ny = Math.max(0, Math.min(c.y + c.h - 20, c.y + dy));
        nh = c.h - (ny - c.y);
      }
      if (dragging.includes('b')) {
        nh = Math.max(20, Math.min(maxH - c.y, pos.y - c.y));
      }
      setCrop({ x: nx, y: ny, w: nw, h: nh });
    }
  };

  const handleMouseUp = () => setDragging(null);

  // 確認時：依 crop 比例對 naturalSize 取出 canvas 區域
  const handleConfirm = async () => {
    if (!imgRef.current || !crop || crop.w < 5 || crop.h < 5) {
      // 區域太小或沒選 → 直接傳原圖
      onConfirm(file);
      return;
    }
    const img = imgRef.current;
    const displayW = img.getBoundingClientRect().width;
    const displayH = img.getBoundingClientRect().height;
    const ratioX = imgSize.w / displayW;
    const ratioY = imgSize.h / displayH;

    const sx = crop.x * ratioX;
    const sy = crop.y * ratioY;
    const sw = crop.w * ratioX;
    const sh = crop.h * ratioY;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    canvas.toBlob((blob) => {
      const cropped = new File([blob], file.name, { type: file.type || 'image/jpeg' });
      onConfirm(cropped);
    }, file.type || 'image/jpeg', 0.95);
  };

  const handleSelectAll = () => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    setCrop({ x: 0, y: 0, w: rect.width, h: rect.height });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 z-[70] flex items-center justify-center p-2 sm:p-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      <div className="bg-white rounded-xl max-w-3xl w-full p-4 max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium">選取要上傳的區域</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">在圖上拖曳框選；拖動框內可移動；拖角落可縮放。不裁切就點「上傳整張」。</p>
          </div>
          <button onClick={onCancel} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div ref={containerRef} className="flex-1 overflow-auto bg-slate-100 rounded relative flex items-center justify-center min-h-[300px]">
          {imgSrc && (
            <div className="relative inline-block" style={{ touchAction: 'none' }}>
              <img
                ref={imgRef}
                src={imgSrc}
                alt="預覽"
                onLoad={handleImgLoad}
                onMouseDown={handleNewBoxStart}
                onTouchStart={handleNewBoxStart}
                draggable={false}
                className="max-w-full max-h-[60vh] block select-none cursor-crosshair"
              />
              {crop && crop.w > 0 && crop.h > 0 && (
                <>
                  {/* 暗化外圍 */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    boxShadow: `0 0 0 9999px rgba(0,0,0,0.5)`,
                    clipPath: `polygon(
                      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                      ${crop.x}px ${crop.y}px,
                      ${crop.x}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y + crop.h}px,
                      ${crop.x + crop.w}px ${crop.y}px,
                      ${crop.x}px ${crop.y}px
                    )`,
                  }} />
                  {/* 裁切框 */}
                  <div
                    onMouseDown={(e) => handleMouseDown(e, 'move')}
                    onTouchStart={(e) => handleMouseDown(e, 'move')}
                    className="absolute border-2 border-blue-400 cursor-move"
                    style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
                  >
                    {/* 4 個角落把手 */}
                    {['tl','tr','bl','br'].map(p => (
                      <div
                        key={p}
                        onMouseDown={(e) => handleMouseDown(e, p)}
                        onTouchStart={(e) => handleMouseDown(e, p)}
                        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-sm"
                        style={{
                          left: p.includes('l') ? -7 : 'auto',
                          right: p.includes('r') ? -7 : 'auto',
                          top: p.includes('t') ? -7 : 'auto',
                          bottom: p.includes('b') ? -7 : 'auto',
                          cursor: (p === 'tl' || p === 'br') ? 'nwse-resize' : 'nesw-resize',
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <button
            onClick={handleSelectAll}
            className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded"
          >全選</button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="text-xs px-3 py-1.5 hover:bg-slate-100 rounded">取消</button>
            <button
              onClick={() => onConfirm(file)}
              className="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded"
            >上傳整張</button>
            <button
              onClick={handleConfirm}
              className="text-sm px-4 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 font-medium"
            >裁切並上傳</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductImagesSection({ images, onChange }) {
  const [previewIdx, setPreviewIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [cropQueue, setCropQueue] = useState([]); // 等待裁剪的檔案
  const [cropCurrent, setCropCurrent] = useState(null); // 目前正在裁剪的檔案
  const [pasteHint, setPasteHint] = useState(false); // 滑鼠進入時顯示「可貼上」提示
  const dragCounter = useRef(0);
  const sectionRef = useRef(null);
  const fileRef = useRef(null);

  const getImgUrl = (img) => img.url || img.dataUrl;

  // 監聽全域 paste 事件，但只有滑鼠在這個區塊時才處理
  useEffect(() => {
    const handlePaste = (e) => {
      if (!pasteHint) return; // 滑鼠不在區塊內，不處理
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            // 重新命名（剪貼簿圖片通常叫 image.png）
            const renamed = new File([file], `貼上圖片_${Date.now()}.${file.type.split('/')[1] || 'png'}`, { type: file.type });
            imageFiles.push(renamed);
          }
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        startCropFlow(imageFiles);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pasteHint]);

  const uploadOne = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`「${file.name}」超過 10MB，跳過`);
      return null;
    }
    const result = await uploadFileToStorage(file, setProgress);
    return {
      name: result.name, url: result.url, path: result.path,
      size: result.size, type: result.type,
    };
  };

  // 開始處理檔案：先放進待裁剪佇列
  const startCropFlow = (rawFiles) => {
    const imageFiles = rawFiles.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    setCropQueue(imageFiles);
    setCropCurrent(imageFiles[0]);
  };

  // 使用者完成一張的裁剪/上傳整張，繼續下一張
  const handleCropConfirm = async (resultFile) => {
    setCropCurrent(null);
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadOne(resultFile);
      if (uploaded) onChange([...images, uploaded]);
    } catch (err) {
      alert('上傳失敗：' + err.message);
    }
    setUploading(false);
    setProgress(0);
    // 處理佇列中下一張
    const remaining = cropQueue.slice(1);
    setCropQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => setCropCurrent(remaining[0]), 100);
    }
  };

  const handleCropCancel = () => {
    setCropCurrent(null);
    // 跳過這張，處理下一張
    const remaining = cropQueue.slice(1);
    setCropQueue(remaining);
    if (remaining.length > 0) {
      setTimeout(() => setCropCurrent(remaining[0]), 100);
    }
  };

  const handleUpload = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    startCropFlow(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    startCropFlow(Array.from(e.dataTransfer.files || []));
  };

  const handleSetAsMain = (idx) => {
    if (idx === 0) return;
    const newImgs = [...images];
    const [picked] = newImgs.splice(idx, 1);
    newImgs.unshift(picked);
    onChange(newImgs);
  };

  const handleRemove = async (idx) => {
    const img = images[idx];
    if (img.path) {
      await deleteFileFromStorage(img.path);
    }
    onChange(images.filter((_, i) => i !== idx));
    setPreviewIdx(null);
  };

  return (
    <section
      ref={sectionRef}
      onMouseEnter={() => setPasteHint(true)}
      onMouseLeave={() => setPasteHint(false)}
      onDragEnter={(e) => {
        e.preventDefault();
        if (uploading) return;
        dragCounter.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) setDragOver(true);
      }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
          dragCounter.current = 0;
          setDragOver(false);
        }
      }}
      onDrop={(e) => {
        dragCounter.current = 0;
        handleDrop(e);
      }}
      className={dragOver ? 'ring-2 ring-blue-400 ring-offset-2 rounded-lg' : ''}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide">
          產品圖片 {dragOver && <span className="text-blue-600 ml-2 text-[11px]">↓ 放開以上傳</span>}
          {pasteHint && !dragOver && <span className="text-slate-400 ml-2 text-[10px] normal-case">· 可拖檔或 Ctrl+V 貼上</span>}
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium disabled:opacity-40"
        >
          {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          {uploading ? `上傳中 ${progress.toFixed(0)}%` : '上傳圖片'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {uploading && (
        <div className="h-1 bg-blue-100 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {images.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-6 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-600 transition"
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-xs">點擊上傳產品圖片（可多張）</span>
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {images.map((img, i) => {
              const isCover = img.fit === 'cover'; // 預設 contain
              return (
                <div key={i} className="relative group">
                  <button
                    onClick={() => setPreviewIdx(i)}
                    className="block w-full aspect-square rounded-lg border border-slate-200 overflow-hidden bg-white hover:border-slate-400"
                  >
                    <StorageImage
                      src={getImgUrl(img)}
                      path={img.path}
                      alt={img.name}
                      className="w-full h-full"
                      style={{ objectFit: isCover ? 'cover' : 'contain' }}
                    />
                  </button>
                  {i === 0 && (
                    <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded">主圖</span>
                  )}
                  <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                    {i !== 0 && (
                      <button
                        onClick={() => handleSetAsMain(i)}
                        title="設為主圖"
                        className="bg-white/90 hover:bg-white text-slate-700 rounded w-5 h-5 flex items-center justify-center text-[10px] border border-slate-200"
                      >
                        ★
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const newImages = [...images];
                        newImages[i] = { ...img, fit: isCover ? 'contain' : 'cover' };
                        onChange(newImages);
                      }}
                      title={isCover ? '改為「完整顯示」（不切圖、留白邊）' : '改為「填滿」（切圖填滿格子）'}
                      className="bg-white/90 hover:bg-white text-slate-700 rounded w-5 h-5 flex items-center justify-center text-[10px] border border-slate-200"
                    >
                      {isCover ? '⊞' : '⊟'}
                    </button>
                    <button
                      onClick={() => handleRemove(i)}
                      title="刪除"
                      className="bg-white/90 hover:bg-rose-50 text-rose-600 rounded w-5 h-5 flex items-center justify-center border border-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            第一張為主圖（顯示在列表縮圖）。⊟ 完整顯示 / ⊞ 填滿格子可切換
          </p>
        </>
      )}

      {previewIdx !== null && images[previewIdx] && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewIdx(null)}
        >
          <StorageImage src={getImgUrl(images[previewIdx])} path={images[previewIdx].path} alt={images[previewIdx].name} className="max-w-full max-h-full rounded" />
        </div>
      )}

      {cropCurrent && (
        <ImageCropModal
          file={cropCurrent}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </section>
  );
}
function CollapsibleSection({ title, badge, children, defaultOpen = false, accent = 'slate' }) {
  const [open, setOpen] = useState(defaultOpen);
  const accentMap = {
    slate: 'border-slate-200',
    blue: 'border-blue-200',
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
    violet: 'border-violet-200',
  };
  return (
    <section className={`bg-white border ${accentMap[accent] || accentMap.slate} rounded-lg overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <h3 className="text-sm font-medium text-slate-800">{title}</h3>
          {badge !== undefined && badge !== null && (
            <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{badge}</span>
          )}
        </div>
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-slate-100">{children}</div>}
    </section>
  );
}

function PhaseTimeline({ project, onOverride }) {
  const [showPicker, setShowPicker] = useState(false);
  const autoPhase = computeAutoPhase(project);
  const currentPhase = getCurrentPhase(project);
  const phaseDetail = getPhaseDetail(project);
  const isOverridden = !!project.phaseOverride && project.phaseOverride !== autoPhase;

  const currentIdx = PHASE_DEFINITIONS.findIndex(p => p.key === currentPhase);

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-xs font-medium text-slate-700 uppercase tracking-wide">產品階段</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">EVT/DVT/PVT/MP 業界標準流程</p>
        </div>
        <button
          onClick={() => setShowPicker(true)}
          className="text-xs text-blue-600 hover:underline"
        >
          手動調整
        </button>
      </div>

      <div className="relative pt-2 pb-1">
        <div className="absolute top-[18px] left-3 right-3 h-0.5 bg-slate-200"></div>
        <div
          className="absolute top-[18px] left-3 h-0.5 bg-blue-500 transition-all"
          style={{ width: currentIdx > 0 ? `calc((100% - 24px) * ${currentIdx} / ${PHASE_DEFINITIONS.length - 1})` : '0%' }}
        ></div>

        <div className="relative grid grid-cols-5 gap-1">
          {PHASE_DEFINITIONS.map((p, i) => {
            const cfg = PHASE_COLORS[p.key];
            const isCurrent = p.key === currentPhase;
            const isPast = i < currentIdx;
            return (
              <div key={p.key} className="flex flex-col items-center text-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium border-2 transition mb-1.5 z-10 ${
                  isCurrent
                    ? `${cfg.dot} text-white border-white shadow-md ring-2 ${cfg.border}`
                    : isPast
                      ? 'bg-blue-500 text-white border-white'
                      : 'bg-white text-slate-400 border-slate-300'
                }`}>
                  {isPast ? '✓' : i + 1}
                </div>
                <p className={`text-[11px] font-medium ${isCurrent ? cfg.text : isPast ? 'text-slate-700' : 'text-slate-400'}`}>
                  {p.label}
                </p>
                <p className={`text-[9px] leading-tight mt-0.5 ${isCurrent ? 'text-slate-600' : 'text-slate-400'}`}>
                  {p.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <span className="text-xs text-slate-500">目前：</span>
          <span className={`text-sm font-medium ${PHASE_COLORS[currentPhase].text}`}>
            {currentPhase}
          </span>
          {phaseDetail && (
            <span className="text-xs text-slate-500 ml-2">· {phaseDetail}</span>
          )}
        </div>
        {isOverridden && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              已覆蓋（自動：{autoPhase}）
            </span>
            <button
              onClick={() => onOverride(null)}
              className="text-[10px] text-blue-600 hover:underline"
            >
              還原自動
            </button>
          </div>
        )}
      </div>

      {showPicker && (
        <PhasePickerModal
          currentPhase={currentPhase}
          autoPhase={autoPhase}
          onSelect={(phase) => {
            onOverride(phase === autoPhase ? null : phase);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </section>
  );
}

function PhasePickerModal({ currentPhase, autoPhase, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">選擇階段</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          系統根據手板/模具/試模/料號狀態自動判斷階段，但你可以手動覆蓋。
        </p>
        <div className="space-y-2">
          {PHASE_DEFINITIONS.map(p => {
            const cfg = PHASE_COLORS[p.key];
            const isAuto = p.key === autoPhase;
            const isCurrent = p.key === currentPhase;
            return (
              <button
                key={p.key}
                onClick={() => onSelect(p.key)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  isCurrent
                    ? `${cfg.bg} ${cfg.border} border-2`
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-medium ${isCurrent ? cfg.text : 'text-slate-700'}`}>
                      {p.label}
                    </span>
                    <span className="text-xs text-slate-500">{p.subtitle}</span>
                  </div>
                  <div className="flex gap-1">
                    {isAuto && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">自動</span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">目前</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 上傳檔案到 Firebase Storage
async function uploadFileToStorage(file, onProgress) {
  const safeName = file.name.replace(/[^\w.-]/g, '_');
  const path = `${STORAGE_FOLDER}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safeName}`;
  const fileRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(fileRef, file);
  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snap) => {
        if (onProgress) onProgress((snap.bytesTransferred / snap.totalBytes) * 100);
      },
      reject,
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ url, path, name: file.name, size: file.size, type: file.type });
      }
    );
  });
}

async function deleteFileFromStorage(path) {
  if (!path) return;
  try {
    await deleteObject(storageRef(storage, path));
  } catch (e) {
    console.warn('刪除 Storage 檔案失敗:', e.message);
  }
}

function getFileIcon(name = '', type = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (ext === 'pdf' || type === 'application/pdf') return '📕';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['stp', 'step', 'iges', 'igs', 'stl', 'obj'].includes(ext)) return '🧊';
  if (['ppt', 'pptx'].includes(ext)) return '📊';
  if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
  return '📄';
}

function isImageFile(name = '', type = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
}

function isPdfFile(name = '', type = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  return type === 'application/pdf' || ext === 'pdf';
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function FilePreviewModal({ file, onClose }) {
  if (!file) return null;
  const isImage = isImageFile(file.name, file.type);
  const isPdf = isPdfFile(file.name, file.type);
  return (
    <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <span>{getFileIcon(file.name, file.type)}</span>
            <span className="text-sm font-medium truncate">{file.name}</span>
            {file.size && <span className="text-xs text-slate-400 flex-shrink-0">({formatFileSize(file.size)})</span>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />下載
            </a>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-0">
          {isImage ? (
            <StorageImage src={file.url} path={file.path} alt={file.name} className="max-w-full max-h-[80vh] object-contain" />
          ) : isPdf ? (
            <iframe src={file.url} title={file.name} className="w-full h-[80vh] border-0" />
          ) : (
            <div className="text-center p-12">
              <div className="text-6xl mb-4">{getFileIcon(file.name, file.type)}</div>
              <p className="text-slate-600 mb-1">{file.name}</p>
              <p className="text-xs text-slate-400 mb-4">此檔案類型無法在系統內預覽</p>
              <a href={file.url} download={file.name} className="inline-flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
                <Download className="w-4 h-4" />下載檔案
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentList({ attachments, onChange, readOnly }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewing, setPreviewing] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const dragCounter = useRef(0); // 用 counter 解決子元素進出誤判
  const fileInputRef = useRef(null);

  // 監聽全域 paste（但只在滑鼠 hover 此區塊時觸發）
  useEffect(() => {
    const handlePaste = (e) => {
      if (!pasteHint || readOnly || uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) {
            const renamed = new File([f], `貼上圖片_${Date.now()}.${f.type.split('/')[1] || 'png'}`, { type: f.type });
            files.push(renamed);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pasteHint, readOnly, uploading]);

  const handleAddLink = () => {
    if (!newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;
    const name = newName.trim() || url.split('/').pop() || '附件';
    onChange([...(attachments || []), { name, url, kind: 'link' }]);
    setNewName(''); setNewUrl(''); setAdding(false);
  };

  const handleFiles = async (files) => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress(0);
    const newItems = [];
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          alert(`「${file.name}」超過 20MB，請改用「貼連結」上傳到 Google Drive`);
          continue;
        }
        const result = await uploadFileToStorage(file, setProgress);
        newItems.push({
          name: result.name, url: result.url, path: result.path,
          size: result.size, type: result.type, kind: 'upload',
        });
      }
      if (newItems.length > 0) {
        onChange([...(attachments || []), ...newItems]);
      }
    } catch (err) {
      alert('上傳失敗：' + err.message);
    }
    setUploading(false);
    setProgress(0);
  };

  const handleFilePick = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await handleFiles(files);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly || uploading) return;
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragOver(true);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 不在這裡 setState，避免閃爍
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragOver(false);
    if (readOnly || uploading) return;

    // 先嘗試取得真實檔案
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await handleFiles(files);
      return;
    }

    // 沒有檔案 → 試著取網頁連結（從 SharePoint / Google Drive 等網頁拖過來）
    const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (url && /^https?:\/\//.test(url.trim())) {
      // 嘗試從拖曳資料取得標題（部分網站會傳）
      const title = e.dataTransfer.getData('text/html');
      let displayName = '';
      if (title) {
        // 從 HTML 抽出文字
        const tmp = document.createElement('div');
        tmp.innerHTML = title;
        displayName = tmp.innerText.trim().split('\n')[0] || '';
      }
      if (!displayName) {
        // 從 URL 取最後段當檔名
        try {
          const u = new URL(url);
          const parts = u.pathname.split('/').filter(Boolean);
          displayName = decodeURIComponent(parts[parts.length - 1] || u.hostname);
        } catch {
          displayName = url;
        }
      }
      onChange([...(attachments || []), {
        name: displayName.slice(0, 80),
        url: url.trim(),
        kind: 'link',
      }]);
      return;
    }

    alert('無法處理拖入的內容。如果是從 SharePoint 網頁拖檔案，請改用 Chrome 的「下載」後再拖；或點「貼連結」貼上網址。');
  };

  const handleDelete = async (idx) => {
    const item = (attachments || [])[idx];
    if (item?.kind === 'upload' && item.path) {
      await deleteFileFromStorage(item.path);
    }
    onChange((attachments || []).filter((_, i) => i !== idx));
  };

  const list = attachments || [];
  const uploadCount = list.filter(a => a.kind === 'upload' && a.url).length;

  // 批次下載：逐一觸發瀏覽器下載
  const downloadAll = async () => {
    const uploads = list.filter(a => a.kind === 'upload' && a.url);
    for (let i = 0; i < uploads.length; i++) {
      const a = uploads[i];
      try {
        const res = await fetch(a.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = a.name || `file-${i + 1}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        // 小延遲避免瀏覽器擋下載
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.warn('下載失敗：', a.name, e);
      }
    }
  };

  return (
    <div
      className={`mt-2 transition rounded ${dragOver ? 'bg-blue-50 ring-2 ring-blue-400 ring-offset-1 p-1' : ''}`}
      onMouseEnter={() => setPasteHint(true)}
      onMouseLeave={() => setPasteHint(false)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOver && (
        <div className="text-center py-1.5 text-xs text-blue-700 font-medium">
          ↓ 放開以上傳檔案
        </div>
      )}
      {list.length > 0 && (
        <div className="space-y-1 mb-1.5">
          {list.map((a, i) => {
            const isImage = isImageFile(a.name, a.type);
            return (
              <div key={i} className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1 group">
                {isImage && a.kind === 'upload' ? (
                  <StorageImage src={a.url} path={a.path} alt={a.name} className="w-8 h-8 object-cover rounded flex-shrink-0 cursor-pointer" onClick={() => setPreviewing(a)} />
                ) : (
                  <span className="text-sm flex-shrink-0">{getFileIcon(a.name, a.type)}</span>
                )}
                <button
                  onClick={() => a.kind === 'upload' ? setPreviewing(a) : window.open(a.url, '_blank')}
                  className="text-xs text-blue-600 hover:underline flex-1 min-w-0 truncate text-left"
                  title={a.url}
                >
                  {a.name}
                </button>
                {a.size && <span className="text-[10px] text-slate-400 flex-shrink-0">{formatFileSize(a.size)}</span>}
                <span className="text-[10px] text-slate-400 flex-shrink-0">{a.kind === 'upload' ? '☁' : '↗'}</span>
                {!readOnly && (
                  <button
                    onClick={() => handleDelete(i)}
                    className="opacity-0 group-hover:opacity-100 transition p-0.5 text-slate-400 hover:text-rose-600 flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewing && <FilePreviewModal file={previewing} onClose={() => setPreviewing(null)} />}

      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-1.5 flex items-center gap-2">
          <Loader className="w-3 h-3 text-blue-600 animate-spin flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[11px] text-blue-700 mb-1">上傳中... {progress.toFixed(0)}%</div>
            <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {!readOnly && !uploading && (
        adding ? (
          <div className="bg-blue-50/40 border border-blue-200 rounded p-2 space-y-1.5">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="顯示名稱（選填）"
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
            />
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddLink(); }}
              placeholder="連結網址（Google Drive、SharePoint 等）"
              autoFocus
              className="w-full px-2 py-1 text-xs border border-slate-200 rounded"
            />
            <div className="flex justify-end gap-1.5">
              <button onClick={() => { setAdding(false); setNewName(''); setNewUrl(''); }} className="text-[11px] px-2 py-0.5 hover:bg-white rounded">取消</button>
              <button onClick={handleAddLink} disabled={!newUrl.trim()} className="text-[11px] px-2 py-0.5 bg-slate-900 text-white rounded disabled:opacity-40">加入</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1.5 items-center flex-wrap">
            <button onClick={() => fileInputRef.current?.click()} className="text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-emerald-200">
              <Upload className="w-3 h-3" />上傳檔案
            </button>
            <button onClick={() => setAdding(true)} className="text-[11px] text-blue-600 hover:bg-blue-50 px-2 py-1 rounded inline-flex items-center gap-1">
              <Plus className="w-3 h-3" />貼連結
            </button>
            {uploadCount >= 2 && (
              <button onClick={downloadAll} title="批次下載全部上傳檔案" className="text-[11px] text-slate-600 hover:bg-slate-100 px-2 py-1 rounded inline-flex items-center gap-1 border border-slate-200">
                <Download className="w-3 h-3" />全部下載 ({uploadCount})
              </button>
            )}
            <span className="text-[10px] text-slate-400">或拖檔案到這裡</span>
            <input ref={fileInputRef} type="file" multiple onChange={handleFilePick} className="hidden" />
          </div>
        )
      )}
    </div>
  );
}


// 單一版本的可折疊卡片
function DesignVersionCard({ d, type, isLatest, onUpdateVersion, onEdit, onDelete }) {
  const hasBom = (d.bomAttachments || []).length > 0;
  const bomVisible = hasBom || d.bomEnabled === true;
  const attCount = (d.attachments || []).length;
  const bomCount = (d.bomAttachments || []).length;

  // 最新版本預設展開，其他預設收起
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div className={`rounded border text-xs group ${isLatest ? 'bg-white border-blue-200' : 'bg-white border-slate-200'}`}>
      {/* 標題列 (一律可見) */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-baseline justify-between gap-2 p-2 cursor-pointer hover:bg-slate-50 select-none"
      >
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="text-slate-400 text-[10px]">{expanded ? '▼' : '▶'}</span>
          <span className={`font-medium ${isLatest ? 'text-blue-700' : 'text-slate-600'}`}>{d.version}</span>
          <span className="text-slate-400 tabular-nums">{d.date}</span>
          {hasBom && (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
              📋 BOM
            </span>
          )}
          {/* 收起時顯示摘要 */}
          {!expanded && (
            <span className="text-[10px] text-slate-400 truncate">
              {attCount > 0 && `${attCount} 檔`}
              {attCount > 0 && bomCount > 0 && ' · '}
              {bomCount > 0 && `${bomCount} BOM`}
              {(attCount === 0 && bomCount === 0 && d.notes) && d.notes.slice(0, 30)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* BOM 勾選：沒檔案時可勾 */}
          {expanded && !hasBom && (
            <label
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer hover:text-slate-700 opacity-0 group-hover:opacity-100 transition"
            >
              <input
                type="checkbox"
                checked={d.bomEnabled === true}
                onChange={(e) => onUpdateVersion({ ...d, bomEnabled: e.target.checked })}
                className="w-3 h-3"
              />
              有 BOM
            </label>
          )}
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition" onClick={(e) => e.stopPropagation()}>
            <button onClick={onEdit} className="p-0.5 text-slate-400 hover:text-slate-700">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-rose-600">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 展開內容 */}
      {expanded && (
        <div className="px-2 pb-2 -mt-1">
          {d.notes && <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-1">{d.notes}</p>}
          <AttachmentList
            attachments={d.attachments || []}
            onChange={(newAtt) => onUpdateVersion({ ...d, attachments: newAtt })}
          />
          {/* BOM 區塊 */}
          {bomVisible && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-500 font-medium">📋 BOM 檔案</span>
                {!hasBom && (
                  <button
                    onClick={() => onUpdateVersion({ ...d, bomEnabled: false })}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                    title="收起此區（取消勾選有 BOM）"
                  >
                    收起
                  </button>
                )}
              </div>
              <AttachmentList
                attachments={d.bomAttachments || []}
                onChange={(newAtt) => onUpdateVersion({ ...d, bomAttachments: newAtt })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DesignSection({ designs, onChange }) {
  const [editing, setEditing] = useState(null);

  // BOM 不再是獨立區塊，而是綁在 ID/3D 版本下
  const types = ['ID', '3D'];
  const oldBomList = designs.BOM || []; // 舊資料相容
  const totalVersions = types.reduce((sum, t) => sum + (designs[t]?.length || 0), 0);

  // 計算每個 type 中「有 BOM」的版本數
  const bomCount = types.reduce((sum, t) => {
    return sum + (designs[t] || []).filter(d => (d.bomAttachments || []).length > 0).length;
  }, 0);

  // 自動推算下個版本號：找最大的 Vn，回傳 V(n+1)
  const getNextVersion = (type) => {
    const list = designs[type] || [];
    let maxN = 0;
    list.forEach(item => {
      const m = (item.version || '').match(/^V(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxN) maxN = n;
      }
    });
    return `V${maxN + 1}`;
  };

  const handleAdd = (type) => setEditing({
    type,
    idx: -1,
    data: { version: getNextVersion(type), date: new Date().toISOString().split('T')[0], notes: '', images: [], bomAttachments: [] }
  });
  const handleEdit = (type, idx) => setEditing({ type, idx, data: { ...designs[type][idx] } });
  const handleSave = () => {
    const { type, idx, data } = editing;
    const list = [...(designs[type] || [])];
    if (idx === -1) list.unshift(data);
    else list[idx] = data;
    onChange({ ...designs, [type]: list });
    setEditing(null);
  };
  const handleDelete = (type, idx) => {
    const list = (designs[type] || []).filter((_, i) => i !== idx);
    onChange({ ...designs, [type]: list });
  };

  // 刪除舊版 BOM 紀錄
  const handleDeleteOldBom = (idx) => {
    if (!confirm('確定刪除這筆舊版 BOM 紀錄嗎？')) return;
    const list = (designs.BOM || []).filter((_, i) => i !== idx);
    onChange({ ...designs, BOM: list });
  };

  const badge = totalVersions > 0
    ? `${totalVersions} 個版本${bomCount > 0 ? ` · ${bomCount} BOM` : ''}`
    : '無';

  return (
    <CollapsibleSection title="設計圖紙版本" badge={badge} defaultOpen={false} accent="slate">
      <div className="space-y-3 mt-2">
        {types.map(type => {
          const list = designs[type] || [];
          const latest = list[0];
          return (
            <div key={type} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-800">{type === '3D' ? '3D 圖' : 'ID 圖'}</span>
                  {latest && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded font-medium">最新 {latest.version}</span>
                  )}
                </div>
                <button onClick={() => handleAdd(type)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" />新版本
                </button>
              </div>
              {list.length === 0 ? (
                <p className="text-xs text-slate-400 py-1">尚無版本</p>
              ) : (
                <div className="space-y-1.5">
                  {list.map((d, i) => (
                    <DesignVersionCard
                      key={i}
                      d={d}
                      type={type}
                      isLatest={i === 0}
                      onUpdateVersion={(newD) => {
                        const newList = [...list];
                        newList[i] = newD;
                        onChange({ ...designs, [type]: newList });
                      }}
                      onEdit={() => handleEdit(type, i)}
                      onDelete={() => handleDelete(type, i)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* 舊版獨立 BOM 紀錄區塊：只有舊資料有東西時才顯示 */}
        {oldBomList.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-amber-800">📋 舊版 BOM 紀錄</span>
              <span className="text-[10px] text-amber-600">（建議移轉到對應的 ID/3D 版本下）</span>
            </div>
            <div className="space-y-1.5">
              {oldBomList.map((d, i) => (
                <div key={i} className="p-2 rounded border bg-white border-amber-200 text-xs group">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-amber-700">{d.version}</span>
                      <span className="text-slate-400 tabular-nums">{d.date}</span>
                    </div>
                    <button onClick={() => handleDeleteOldBom(i)} className="opacity-0 group-hover:opacity-100 transition p-0.5 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {d.notes && <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{d.notes}</p>}
                  <AttachmentList
                    attachments={d.attachments || []}
                    onChange={(newAtt) => {
                      const newList = [...oldBomList];
                      newList[i] = { ...d, attachments: newAtt };
                      onChange({ ...designs, BOM: newList });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <DesignVersionForm
          type={editing.type}
          data={editing.data}
          onChange={(d) => setEditing({ ...editing, data: d })}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </CollapsibleSection>
  );
}

function DesignVersionForm({ type, data, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5">
        <h3 className="text-sm font-medium mb-4">新增 / 編輯 {type} 版本</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">版本</label>
              <input
                type="text"
                value={data.version}
                onChange={(e) => onChange({ ...data, version: e.target.value })}
                placeholder="例：V1, V2.1"
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">日期</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => onChange({ ...data, date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">變更說明</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
              rows={3}
              placeholder="這版有什麼改動？"
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 hover:bg-slate-100 rounded">取消</button>
          <button onClick={onSave} disabled={!data.version} className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded disabled:opacity-50">儲存</button>
        </div>
      </div>
    </div>
  );
}

function DFMSection({ hasDFM, dfmNotes, dfmAttachments, onToggle, onNotesChange, onAttachmentsChange }) {
  const [editing, setEditing] = useState(false);
  const [tempNotes, setTempNotes] = useState(dfmNotes);

  return (
    <CollapsibleSection
      title="DFM"
      badge={hasDFM ? (dfmAttachments?.length ? `有 · ${dfmAttachments.length} 檔` : '有') : '無'}
      defaultOpen={false}
      accent={hasDFM ? 'blue' : 'slate'}
    >
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasDFM}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-slate-700">此產品有做 DFM</span>
        </label>
        {hasDFM && (
          <div>
            {editing ? (
              <div>
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="DFM 說明、回饋、修改點..."
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { onNotesChange(tempNotes); setEditing(false); }}
                    className="text-xs px-3 py-1 bg-slate-900 text-white rounded"
                  >儲存</button>
                  <button onClick={() => { setTempNotes(dfmNotes); setEditing(false); }} className="text-xs px-3 py-1 hover:bg-slate-100 rounded">取消</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => { setTempNotes(dfmNotes); setEditing(true); }}
                className="text-sm text-slate-700 leading-relaxed cursor-text hover:bg-slate-50 p-2 -m-2 rounded whitespace-pre-wrap min-h-[2rem]"
              >
                {dfmNotes || <span className="text-slate-400 text-xs">點擊新增 DFM 說明...</span>}
              </div>
            )}
            <AttachmentList
              attachments={dfmAttachments || []}
              onChange={onAttachmentsChange}
            />
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}

// 手板總覽 - 自動彙整所有產品的手板訂單
function PrototypeOverviewModal({ projects, onClose, onJumpToProject }) {
  const [statusFilter, setStatusFilter] = useState('全部');
  const [locationFilter, setLocationFilter] = useState('全部');
  const [supplierFilter, setSupplierFilter] = useState('全部');
  const [searchTerm, setSearchTerm] = useState('');

  // 把所有產品的手板訂單攤平成一個清單
  const allPrototypes = useMemo(() => {
    const list = [];
    projects.forEach(p => {
      (p.prototypeOrders || []).forEach(o => {
        // 優先使用手板訂單自己的圖片附件，沒有的話用產品主圖
        const ownImage = (o.attachments || []).find(a => isImageFile(a.name, a.type));
        const productMainImage = (p.productImages || [])[0];
        list.push({
          ...o,
          _projectId: p.id,
          _projectName: p.name,
          _projectCode: p.code,
          _displayImage: ownImage || productMainImage,
        });
      });
    });
    return list;
  }, [projects]);

  // 取出唯一的篩選選項
  const statusOptions = useMemo(() => [...new Set(allPrototypes.map(o => o.status).filter(Boolean))], [allPrototypes]);
  const locationOptions = useMemo(() => [...new Set(allPrototypes.map(o => o.storageLocation).filter(Boolean))], [allPrototypes]);
  const supplierOptions = useMemo(() => [...new Set(allPrototypes.map(o => o.supplier).filter(Boolean))], [allPrototypes]);

  // 套用篩選
  const filtered = useMemo(() => {
    return allPrototypes.filter(o => {
      const matchStatus = statusFilter === '全部' || o.status === statusFilter;
      const matchLocation = locationFilter === '全部' || o.storageLocation === locationFilter;
      const matchSupplier = supplierFilter === '全部' || o.supplier === supplierFilter;
      const matchSearch = !searchTerm || [
        o._projectName, o._projectCode, o.orderNo, o.partNo, o.material, o.storageLocation
      ].some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchLocation && matchSupplier && matchSearch;
    });
  }, [allPrototypes, statusFilter, locationFilter, supplierFilter, searchTerm]);

  // 匯出 CSV
  const exportCSV = () => {
    const headers = ['產品', '料號', '訂單號', '對應ID', '對應3D', '材質', '數量', '狀態', '存放位置', '供應商', '下單日'];
    const rows = filtered.map(o => [
      o._projectName, o._projectCode, o.orderNo, o.idVersion, o.threeDVersion,
      o.material, o.quantity, o.status, o.storageLocation, o.supplier, o.orderDate
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `手板總覽_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-5xl w-full p-4 sm:p-5 my-auto max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium flex items-center gap-2">
              <span>📦</span>手板總覽
              <span className="text-xs text-slate-400 font-normal">({filtered.length} / {allPrototypes.length} 筆)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">所有產品的手板訂單彙整 · 修改請到對應產品頁</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* 篩選器 */}
        <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-100">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜尋產品、料號、訂單號、材質、位置..."
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-slate-200 rounded"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded bg-white">
            <option value="全部">全部狀態</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded bg-white">
            <option value="全部">全部位置</option>
            {locationOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-200 rounded bg-white">
            <option value="全部">全部供應商</option>
            {supplierOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded inline-flex items-center gap-1"
          >
            <Download className="w-3 h-3" />匯出 CSV
          </button>
        </div>

        {/* 清單 */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">沒有符合條件的手板</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((o, i) => (
                <div
                  key={`${o._projectId}-${o.id || i}`}
                  onClick={() => onJumpToProject(o._projectId)}
                  className="bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 rounded-lg p-3 cursor-pointer transition flex gap-3"
                >
                  {/* 左側：產品圖片 */}
                  <div className="flex-shrink-0 w-20 h-20 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {o._displayImage ? (
                      <StorageImage
                        src={o._displayImage.url || o._displayImage.dataUrl}
                        path={o._displayImage.path}
                        alt={o._projectName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  {/* 右側：主要資訊 */}
                  <div className="flex-1 min-w-0">
                    {/* 第一行：產品名（大）+ 料號 + 狀態 */}
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                        <span className="text-base font-semibold text-slate-900 truncate">{o._projectName}</span>
                        {o._projectCode && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{o._projectCode}</span>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${ORDER_STATUS_COLORS[o.status] || ORDER_STATUS_COLORS['已下單']}`}>{o.status}</span>
                    </div>

                    {/* 第二行：數量 + 位置（顯眼） */}
                    <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">
                        <span className="text-slate-400 text-xs mr-0.5">數量</span>
                        {o.quantity} 個
                      </span>
                      {o.storageLocation && (
                        <span className="text-sm font-medium text-emerald-700">
                          <span className="text-slate-400 text-xs mr-0.5">📍 位置</span>
                          {o.storageLocation}
                        </span>
                      )}
                    </div>

                    {/* 第三行：版本/材質/供應商（次要，小字） */}
                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      {o.orderNo && <span>#{o.orderNo}</span>}
                      {o.idVersion && <span className="text-blue-600">ID {o.idVersion}</span>}
                      {o.threeDVersion && <span className="text-purple-600">3D {o.threeDVersion}</span>}
                      {o.material && <span>{o.material}</span>}
                      {o.supplier && <span>{o.supplier}</span>}
                      <span className="tabular-nums">{o.orderDate}</span>
                    </div>

                    {/* 變更說明（最不顯眼，但仍列出） */}
                    {o.review && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{o.review}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrototypeSection({ orders, onChange, defaultSupplier, readOnly, designs }) {
  const [editing, setEditing] = useState(null);

  const totalCost = orders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.unitPrice || 0)), 0);

  const handleAdd = () => setEditing({
    idx: -1,
    data: {
      id: `p${Date.now()}`, orderNo: '', partNo: '', supplier: defaultSupplier || '',
      quantity: 1, unitPrice: 0, currency: 'TWD',
      orderDate: new Date().toISOString().split('T')[0], status: '已下單',
      storageLocation: '', review: '',
      idVersion: '', threeDVersion: '', material: '', attachments: [],
    }
  });
  const handleEdit = (idx) => setEditing({ idx, data: { ...orders[idx] } });
  const handleSave = () => {
    const { idx, data } = editing;
    const list = [...orders];
    if (idx === -1) list.push(data);
    else list[idx] = data;
    onChange(list);
    setEditing(null);
  };
  const handleDelete = (idx) => onChange(orders.filter((_, i) => i !== idx));

  return (
    <CollapsibleSection
      title="手板訂單"
      badge={orders.length > 0 ? `${orders.length} 筆 · ${formatMoney(totalCost)} TWD` : '無'}
      defaultOpen={false}
      accent="amber"
    >
      <div className="mt-2 space-y-2">
        {orders.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">尚未下手板訂單</p>
        ) : (
          orders.map((o, i) => (
            <div key={o.id || i} className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium text-slate-900">{o.orderNo || '(無單號)'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${ORDER_STATUS_COLORS[o.status] || ORDER_STATUS_COLORS['已下單']}`}>{o.status}</span>
                    {o.idVersion && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono">ID {o.idVersion}</span>}
                    {o.threeDVersion && <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono">3D {o.threeDVersion}</span>}
                    {o.material && <span className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded">{o.material}</span>}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    {o.partNo && <span>料號: {o.partNo}</span>}
                    <span>{o.supplier}</span>
                    <span>{o.quantity} 個 × {formatMoney(o.unitPrice)} = {formatMoney(o.quantity * o.unitPrice)} {o.currency}</span>
                    <span className="tabular-nums">{o.orderDate}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button onClick={() => handleEdit(i)} className="p-1 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(i)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {o.storageLocation && (
                <p className="text-xs text-slate-600 mb-1"><span className="text-slate-400">存放：</span>{o.storageLocation}</p>
              )}
              {o.review && (
                <p className="text-xs text-slate-700 leading-relaxed bg-white p-2 rounded border border-amber-100 whitespace-pre-wrap mb-1"><span className="text-slate-400">評價：</span>{o.review}</p>
              )}
              {/* 附件區 - 測試報告 / 影片 / 圖片 */}
              <div className="mt-1">
                <AttachmentList
                  attachments={o.attachments || []}
                  onChange={(newAtt) => {
                    const list = [...orders];
                    list[i] = { ...o, attachments: newAtt };
                    onChange(list);
                  }}
                  readOnly={readOnly}
                />
              </div>
            </div>
          ))
        )}
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 rounded-lg flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />新增手板訂單
          </button>
        )}
      </div>

      {editing && (
        <OrderForm
          kind="手板"
          data={editing.data}
          onChange={(d) => setEditing({ ...editing, data: d })}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          showStorage
          showReview
          showVersionMaterial
          designs={designs}
        />
      )}
    </CollapsibleSection>
  );
}

function MouldSection({ orders, onChange, defaultSupplier, readOnly }) {
  const [editing, setEditing] = useState(null);

  const totalCost = orders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.unitPrice || 0)), 0);

  const handleAdd = () => setEditing({
    idx: -1,
    data: {
      id: `m${Date.now()}`, orderNo: '', partNo: '', supplier: defaultSupplier || '',
      quantity: 1, unitPrice: 0, currency: 'TWD',
      orderDate: new Date().toISOString().split('T')[0], status: '已下單',
      notes: '',
    }
  });
  const handleEdit = (idx) => setEditing({ idx, data: { ...orders[idx] } });
  const handleSave = () => {
    const { idx, data } = editing;
    const list = [...orders];
    if (idx === -1) list.push(data);
    else list[idx] = data;
    onChange(list);
    setEditing(null);
  };
  const handleDelete = (idx) => onChange(orders.filter((_, i) => i !== idx));

  return (
    <CollapsibleSection
      title="模具訂單"
      badge={orders.length > 0 ? `${orders.length} 筆 · ${formatMoney(totalCost)} TWD` : '無'}
      defaultOpen={false}
      accent="violet"
    >
      <div className="mt-2 space-y-2">
        {orders.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">尚未下模具訂單</p>
        ) : (
          orders.map((o, i) => (
            <div key={o.id || i} className="bg-violet-50/50 border border-violet-200 rounded-lg p-3 group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-medium text-slate-900">{o.orderNo || '(無單號)'}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${ORDER_STATUS_COLORS[o.status] || ORDER_STATUS_COLORS['已下單']}`}>{o.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                    {o.partNo && <span>料號: {o.partNo}</span>}
                    <span>{o.supplier}</span>
                    <span>{o.quantity} 套 × {formatMoney(o.unitPrice)} = {formatMoney(o.quantity * o.unitPrice)} {o.currency}</span>
                    <span className="tabular-nums">{o.orderDate}</span>
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button onClick={() => handleEdit(i)} className="p-1 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => handleDelete(i)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {o.notes && (
                <p className="text-xs text-slate-700 leading-relaxed mt-1 whitespace-pre-wrap">{o.notes}</p>
              )}
            </div>
          ))
        )}
        {!readOnly && (
          <button
            onClick={handleAdd}
            className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 rounded-lg flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />新增模具訂單
          </button>
        )}
      </div>

      {editing && (
        <OrderForm
          kind="模具"
          data={editing.data}
          onChange={(d) => setEditing({ ...editing, data: d })}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
          showNotes
        />
      )}
    </CollapsibleSection>
  );
}

function OrderForm({ kind, data, onChange, onCancel, onSave, showStorage, showReview, showNotes, showVersionMaterial, designs }) {
  const idVersions = (designs?.ID || []).map(v => v.version).filter(Boolean);
  const threeDVersions = (designs?.['3D'] || []).map(v => v.version).filter(Boolean);
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 my-auto">
        <h3 className="text-sm font-medium mb-4">新增 / 編輯 {kind}訂單</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">訂單號</label>
              <input
                type="text"
                value={data.orderNo}
                onChange={(e) => onChange({ ...data, orderNo: e.target.value })}
                placeholder="例：PT-001"
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">料號</label>
              <input
                type="text"
                value={data.partNo}
                onChange={(e) => onChange({ ...data, partNo: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">供應商</label>
              <input
                type="text"
                value={data.supplier}
                onChange={(e) => onChange({ ...data, supplier: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">下單日</label>
              <input
                type="date"
                value={data.orderDate}
                onChange={(e) => onChange({ ...data, orderDate: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">數量</label>
              <input
                type="number"
                min="0"
                value={data.quantity}
                onChange={(e) => onChange({ ...data, quantity: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">單價</label>
              <input
                type="number"
                min="0"
                value={data.unitPrice}
                onChange={(e) => onChange({ ...data, unitPrice: Number(e.target.value) })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">幣別</label>
              <select
                value={data.currency}
                onChange={(e) => onChange({ ...data, currency: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
              >
                <option value="TWD">TWD</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">狀態</label>
            <select
              value={data.status}
              onChange={(e) => onChange({ ...data, status: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
            >
              {ORDER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {showVersionMaterial && (
            <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs text-slate-600 mb-1">對應 ID 版本</label>
                <select
                  value={data.idVersion || ''}
                  onChange={(e) => onChange({ ...data, idVersion: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                >
                  <option value="">未指定</option>
                  {idVersions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">對應 3D 版本</label>
                <select
                  value={data.threeDVersion || ''}
                  onChange={(e) => onChange({ ...data, threeDVersion: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
                >
                  <option value="">未指定</option>
                  {threeDVersions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">材質</label>
                <input
                  type="text"
                  value={data.material || ''}
                  onChange={(e) => onChange({ ...data, material: e.target.value })}
                  placeholder="例：ABS、PC、鋁"
                  className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
                />
              </div>
            </div>
          )}
          {showStorage && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">收到後存放位置</label>
              <input
                type="text"
                value={data.storageLocation || ''}
                onChange={(e) => onChange({ ...data, storageLocation: e.target.value })}
                placeholder="例：辦公室樣品櫃 A-3 / 已寄客戶"
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
          )}
          {showReview && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">評價 / 測試結果</label>
              <textarea
                value={data.review || ''}
                onChange={(e) => onChange({ ...data, review: e.target.value })}
                rows={3}
                placeholder="這批手板的評價、測試發現、需要修正的地方..."
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
              />
            </div>
          )}
          {showNotes && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">備註</label>
              <textarea
                value={data.notes || ''}
                onChange={(e) => onChange({ ...data, notes: e.target.value })}
                rows={2}
                placeholder="模具用途、注意事項..."
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 hover:bg-slate-100 rounded">取消</button>
          <button onClick={onSave} className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded">儲存</button>
        </div>
      </div>
    </div>
  );
}

function TrialSection({ trialRuns, trialNotes, onChangeRuns, onChangeNotes }) {
  const [editing, setEditing] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState(trialNotes);

  const usedRounds = trialRuns.map(r => r.round);
  const availableRounds = TRIAL_ROUNDS.filter(r => !usedRounds.includes(r));
  const latestRound = trialRuns.length > 0 ? trialRuns[trialRuns.length - 1].round : null;

  const handleAdd = () => {
    const nextRound = availableRounds[0] || 'T1';
    setEditing({
      idx: -1,
      data: { round: nextRound, date: new Date().toISOString().split('T')[0], issues: '' },
    });
  };
  const handleEdit = (idx) => setEditing({ idx, data: { ...trialRuns[idx] } });
  const handleSave = () => {
    const { idx, data } = editing;
    const list = [...trialRuns];
    if (idx === -1) list.push(data);
    else list[idx] = data;
    list.sort((a, b) => TRIAL_ROUNDS.indexOf(a.round) - TRIAL_ROUNDS.indexOf(b.round));
    onChangeRuns(list);
    setEditing(null);
  };
  const handleDelete = (idx) => onChangeRuns(trialRuns.filter((_, i) => i !== idx));

  return (
    <CollapsibleSection
      title="試模 T1~T4"
      badge={latestRound ? `已到 ${latestRound}` : '未開始'}
      defaultOpen={false}
      accent="emerald"
    >
      <div className="mt-2 space-y-2">
        <div className="flex gap-1.5 flex-wrap mb-2">
          {TRIAL_ROUNDS.map(r => {
            const done = usedRounds.includes(r);
            return (
              <span
                key={r}
                className={`text-xs px-2 py-1 rounded border ${
                  done
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300 font-medium'
                    : 'bg-white text-slate-400 border-slate-200'
                }`}
              >
                {done ? '✓ ' : ''}{r}
              </span>
            );
          })}
        </div>

        {trialRuns.length === 0 ? (
          <p className="text-xs text-slate-400 py-1">尚未開始試模</p>
        ) : (
          <div className="space-y-1.5">
            {trialRuns.map((r, i) => (
              <div key={i} className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 group">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-emerald-700">{r.round}</span>
                    <span className="text-xs text-slate-500 tabular-nums">{r.date}</span>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => handleEdit(i)} className="p-1 text-slate-400 hover:text-slate-700"><Edit2 className="w-3 h-3" /></button>
                    <button onClick={() => handleDelete(i)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
                {r.issues && (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{r.issues}</p>
                )}
                <AttachmentList
                  attachments={r.attachments || []}
                  onChange={(newAtt) => {
                    const updated = [...trialRuns];
                    updated[i] = { ...r, attachments: newAtt };
                    onChangeRuns(updated);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {availableRounds.length > 0 && (
          <button
            onClick={handleAdd}
            className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 border border-dashed border-blue-200 rounded-lg flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />新增 {availableRounds[0]} 紀錄
          </button>
        )}

        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-500 mb-1">試模整體備註</p>
          {editingNotes ? (
            <div>
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                rows={2}
                autoFocus
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
              />
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={() => { onChangeNotes(tempNotes); setEditingNotes(false); }}
                  className="text-xs px-3 py-1 bg-slate-900 text-white rounded"
                >儲存</button>
                <button onClick={() => { setTempNotes(trialNotes); setEditingNotes(false); }} className="text-xs px-3 py-1 hover:bg-slate-100 rounded">取消</button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => { setTempNotes(trialNotes); setEditingNotes(true); }}
              className="text-sm text-slate-700 leading-relaxed cursor-text hover:bg-slate-50 p-1.5 rounded whitespace-pre-wrap min-h-[1.75rem]"
            >
              {trialNotes || <span className="text-slate-400 text-xs">點擊新增備註（如認證進度）...</span>}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TrialRunForm
          data={editing.data}
          availableRounds={editing.idx === -1 ? availableRounds : [...availableRounds, editing.data.round].sort((a, b) => TRIAL_ROUNDS.indexOf(a) - TRIAL_ROUNDS.indexOf(b))}
          onChange={(d) => setEditing({ ...editing, data: d })}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </CollapsibleSection>
  );
}

function TrialRunForm({ data, availableRounds, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5">
        <h3 className="text-sm font-medium mb-4">試模紀錄</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">輪次</label>
              <select
                value={data.round}
                onChange={(e) => onChange({ ...data, round: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded bg-white"
              >
                {availableRounds.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">試模日期</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => onChange({ ...data, date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">遇到的問題 / 需要修正的地方</label>
            <textarea
              value={data.issues}
              onChange={(e) => onChange({ ...data, issues: e.target.value })}
              rows={4}
              placeholder="例：T1 EMC 沒過，需要修改外殼設計..."
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="text-sm px-3 py-1.5 hover:bg-slate-100 rounded">取消</button>
          <button onClick={onSave} className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded">儲存</button>
        </div>
      </div>
    </div>
  );
}

function MaterialCodeSection({ status, materialCode, onChange, onCodeChange }) {
  const options = ['未申請', '申請中', '已申請'];
  const colorMap = {
    '未申請': 'bg-slate-100 text-slate-600 border-slate-200',
    '申請中': 'bg-amber-100 text-amber-700 border-amber-200',
    '已申請': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  const [editing, setEditing] = useState(false);
  const [tempCode, setTempCode] = useState(materialCode || '');

  return (
    <CollapsibleSection
      title="料號申請"
      badge={materialCode ? `${status} · ${materialCode}` : status}
      defaultOpen={false}
      accent={status === '已申請' ? 'emerald' : status === '申請中' ? 'amber' : 'slate'}
    >
      <div className="mt-2 space-y-3">
        <p className="text-xs text-slate-500">通常在 T4 結束後申請正式料號</p>

        <div>
          <p className="text-xs text-slate-600 mb-1.5">狀態</p>
          <div className="flex gap-2 flex-wrap">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => onChange(opt)}
                className={`text-xs px-3 py-1.5 rounded border transition ${
                  status === opt
                    ? colorMap[opt] + ' font-medium'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {status === opt ? '✓ ' : ''}{opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-600 mb-1.5">料號編號</p>
          {editing ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { onCodeChange(tempCode); setEditing(false); }
                  if (e.key === 'Escape') { setTempCode(materialCode || ''); setEditing(false); }
                }}
                autoFocus
                placeholder="例：CMMS0005"
                className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded"
              />
              <button
                onClick={() => { onCodeChange(tempCode); setEditing(false); }}
                className="text-xs px-3 py-1 bg-slate-900 text-white rounded"
              >儲存</button>
              <button
                onClick={() => { setTempCode(materialCode || ''); setEditing(false); }}
                className="text-xs px-3 py-1 hover:bg-slate-100 rounded"
              >取消</button>
            </div>
          ) : (
            <div
              onClick={() => { setTempCode(materialCode || ''); setEditing(true); }}
              className="text-sm cursor-text hover:bg-slate-50 px-2 py-1.5 rounded border border-slate-200 min-h-[2rem]"
            >
              {materialCode ? (
                <span className="font-mono text-emerald-700 font-medium">{materialCode}</span>
              ) : (
                <span className="text-slate-400 text-xs">點擊輸入料號（申請後填入）...</span>
              )}
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toLocaleString('zh-TW');
}


function UpdateForm({ initial, onCancel, onSave }) {
  const [date, setDate] = useState(initial?.date || new Date().toISOString().split('T')[0]);
  const [text, setText] = useState(initial?.text || '');
  const [images, setImages] = useState(initial?.images || []);
  const [uploading, setUploading] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);
  const fileRef = useRef(null);

  const uploadImageFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(`「${file.name}」超過 10MB，跳過`);
      return;
    }
    const result = await uploadFileToStorage(file);
    setImages(prev => [...prev, { name: result.name, url: result.url, path: result.path }]);
  };

  // 監聽 paste（hover 時生效）
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!pasteHint || uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) {
            const renamed = new File([f], `貼上圖片_${Date.now()}.${f.type.split('/')[1] || 'png'}`, { type: f.type });
            files.push(renamed);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        setUploading(true);
        try {
          for (const file of files) await uploadImageFile(file);
        } catch (err) {
          alert('上傳失敗：' + err.message);
        }
        setUploading(false);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [pasteHint, uploading]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) await uploadImageFile(file);
    } catch (err) {
      alert('上傳失敗：' + err.message);
    }
    setUploading(false);
  };

  const handleRemoveImg = async (idx) => {
    const img = images[idx];
    if (img.path) {
      await deleteFileFromStorage(img.path);
    }
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (!text.trim() && images.length === 0) return;
    onSave({ date, text: text.trim(), images });
  };

  return (
    <div
      className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 mb-2"
      onMouseEnter={() => setPasteHint(true)}
      onMouseLeave={() => setPasteHint(false)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-xs px-2 py-1 border border-slate-200 rounded bg-white"
        />
        {pasteHint && <span className="text-[10px] text-slate-400">· Ctrl+V 可貼上圖片</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        placeholder="本週工程更新..."
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none bg-white"
      />
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <StorageImage src={img.url || img.dataUrl} path={img.path} alt={img.name} className="w-16 h-16 object-cover rounded border border-slate-200" />
              <button
                onClick={() => handleRemoveImg(i)}
                className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 hover:bg-white rounded"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          附加圖片
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-xs px-3 py-1 hover:bg-white rounded">取消</button>
          <button onClick={submit} className="text-xs px-3 py-1 bg-slate-900 text-white rounded">儲存</button>
        </div>
      </div>
    </div>
  );
}

function UpdateCard({ update, isLatest, isEditing, onStartEdit, onCancelEdit, onSave, onDelete }) {
  const [previewImg, setPreviewImg] = useState(null);

  if (isEditing) {
    return <UpdateForm initial={update} onCancel={onCancelEdit} onSave={onSave} />;
  }

  const containerClass = isLatest
    ? 'bg-blue-50/40 border-l-2 border-l-blue-500 border-y border-r border-blue-100'
    : 'bg-white border border-slate-200';

  return (
    <>
      <div className={`rounded-lg p-3 ${containerClass} group`}>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className={`text-xs font-medium tabular-nums flex-shrink-0 ${isLatest ? 'text-blue-700' : 'text-slate-500'}`}>
              {update.date}
            </span>
            {isLatest && <span className="text-xs text-blue-600 flex-shrink-0">最新</span>}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
            <button onClick={onStartEdit} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isLatest ? 'text-slate-900' : 'text-slate-700'}`}>
          {update.text}
        </p>
        {update.images && update.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {update.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setPreviewImg(img)}
                className="block"
              >
                <StorageImage
                  src={img.url || img.dataUrl}
                  path={img.path}
                  alt={img.name}
                  className="w-16 h-16 object-cover rounded border border-slate-200 hover:opacity-90"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {previewImg && (
        <div
          className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <StorageImage src={previewImg.url || previewImg.dataUrl} path={previewImg.path} alt={previewImg.name} className="max-w-full max-h-full rounded" />
        </div>
      )}
    </>
  );
}

// === 產品料號編碼規則（依 COMART SOP v1.0）===
// 分類碼：依產品結構/手機端固定方式分類
// 預設分類碼（首次部署時種子化到 Firestore，之後可在系統內編輯）
const DEFAULT_CATEGORY_CODES = [
  { code: 'QIC', label: 'Qi Charger 無線充電', desc: '跟 Qi Charger 相關（優先級最高）' },
  { code: 'HDR', label: 'Holder 夾具', desc: '車用 A+B 結構的夾具' },
  { code: 'BKT', label: 'Bracket 支架', desc: '車用 A+B 結構的支架' },
  { code: 'MOD', label: 'Module / Adapter', desc: '可拆卸但非車用 A+B（VESA、豆莢、AMPS、桌夾等）' },
  { code: 'MGM', label: 'Magnetic Mount 磁吸', desc: '一體式、透過磁吸固定的產品' },
  { code: 'CMR', label: 'Camera Mount 相機', desc: '與相機相關的固定產品' },
  { code: 'OTH', label: 'Others 其他', desc: '以上分類皆不適用' },
];

// 特徵碼：3 碼簡寫對應料號上的 1 碼
// 預設特徵碼（首次部署時種子化到 Firestore，之後可在系統內編輯）
const DEFAULT_FEATURE_CODES = [
  { code: 'M', full: 'MNT', label: 'Mounting System', desc: '車用夾具/支架，需與其他配件組合（優先級高）' },
  { code: 'H', full: 'HDM', label: 'Heavy Duty Mount', desc: '強固型支架（Heavy Duty 相關優先用此）' },
  { code: 'S', full: 'SCP', label: 'Suction Cup 吸盤', desc: '貼在平面表面（玻璃、桌面、牆面、車上）' },
  { code: 'C', full: 'CLP', label: 'Clip 夾扣', desc: '夾扣方式固定（桌夾、冷氣夾）' },
  { code: 'G', full: 'MAG', label: 'Magnetic 磁力', desc: '磁力固定（健身磁吸支架）' },
  { code: 'T', full: 'TND', label: 'Stand 支撐', desc: '只是放著支撐，不吸/夾/磁（平板支架）' },
  { code: 'N', full: 'NON', label: 'None 其他', desc: '以上皆不適用' },
];

// 從料號解析出 prefix（前 4 碼）和流水號
function parseProductCode(code) {
  if (!code) return null;
  const main = code.split('-')[0];
  const m = main.match(/^([A-Z]{3})([A-Z])(\d+)$/);
  if (!m) return null;
  return { category: m[1], feature: m[2], sequence: parseInt(m[3], 10) };
}

function suggestNextSequence(category, feature, existingCodes) {
  let maxSeq = 0;
  existingCodes.forEach(code => {
    const parsed = parseProductCode(code);
    if (parsed && parsed.category === category && parsed.feature === feature) {
      if (parsed.sequence > maxSeq) maxSeq = parsed.sequence;
    }
  });
  return maxSeq + 1;
}

function isCodeDuplicate(code, existingCodes) {
  if (!code) return false;
  return existingCodes.some(c => c.toUpperCase() === code.toUpperCase());
}

// 從料號推算類別（顯示用）— 接收動態 codes
function deriveCategoryFromCode(code, categoryCodes = DEFAULT_CATEGORY_CODES, featureCodes = DEFAULT_FEATURE_CODES) {
  if (!code) return '';
  const parsed = parseProductCode(code);
  if (!parsed) return '';
  const cat = categoryCodes.find(c => c.code === parsed.category);
  const feat = featureCodes.find(f => f.code === parsed.feature);
  if (!cat) return '';
  return `${cat.code} · ${cat.label}${feat ? ` / ${feat.label}` : ''}`;
}

// === 步驟式判斷流程的工具元件 ===
function CodeEditModal({ kind, item, existingCodes, onSave, onClose }) {
  const [code, setCode] = useState(item.code || '');
  const [full, setFull] = useState(item.full || '');
  const [label, setLabel] = useState(item.label || '');
  const [desc, setDesc] = useState(item.desc || '');

  const isNew = item.isNew || false;
  const isCat = kind === 'cat';
  const codeLength = isCat ? 3 : 1;
  const codePlaceholder = isCat ? 'QIC' : 'S';

  const codeValid = code.length === codeLength && /^[A-Z]+$/.test(code);
  const isDuplicate = isNew && existingCodes.includes(code);
  const canSave = codeValid && label.trim() && !isDuplicate;

  const submit = () => {
    if (!canSave) return;
    const data = isCat
      ? { code: code.toUpperCase(), label: label.trim(), desc: desc.trim() }
      : { code: code.toUpperCase(), full: full.trim() || code, label: label.trim(), desc: desc.trim() };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 z-[70] flex items-center justify-center p-3">
      <div className="bg-white rounded-xl max-w-md w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-medium">
            {isNew ? '新增' : '編輯'} {isCat ? '分類碼' : '特徵碼'}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">
              代碼（{codeLength} 個英文大寫字母）
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, codeLength))}
              disabled={!isNew}
              maxLength={codeLength}
              placeholder={codePlaceholder}
              className={`w-full px-3 py-2 text-sm border rounded font-mono ${
                isDuplicate ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
              } ${!isNew ? 'bg-slate-100 text-slate-400' : ''}`}
            />
            {isDuplicate && <p className="text-[11px] text-rose-600 mt-0.5">此代碼已存在</p>}
            {!isNew && <p className="text-[10px] text-slate-400 mt-0.5">代碼建立後不能改</p>}
          </div>

          {!isCat && (
            <div>
              <label className="block text-xs text-slate-600 mb-1">3 碼簡寫（顯示用）</label>
              <input
                type="text"
                value={full}
                onChange={(e) => setFull(e.target.value.toUpperCase().slice(0, 3))}
                maxLength={3}
                placeholder="SCP"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-600 mb-1">名稱</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isCat ? 'Qi Charger 無線充電' : 'Suction Cup 吸盤'}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">備註 / 適用情境</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder={isCat ? '跟 Qi Charger 相關（優先級最高）' : '貼在某表面（玻璃、桌面、車上）'}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="text-sm px-3 py-1.5 hover:bg-slate-100 rounded">
            取消
          </button>
          <button
            onClick={submit}
            disabled={!canSave}
            className="text-sm px-4 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40"
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductCodeWizard({ existingCodes, categoryCodes = DEFAULT_CATEGORY_CODES, featureCodes = DEFAULT_FEATURE_CODES, onApply, onClose }) {
  const [category, setCategory] = useState(null);
  const [feature, setFeature] = useState(null);
  const [seqOverride, setSeqOverride] = useState(null);
  const [suffix, setSuffix] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingCat, setEditingCat] = useState(null); // {code, label, desc} or null
  const [editingFeat, setEditingFeat] = useState(null);

  const autoSeq = (category && feature)
    ? suggestNextSequence(category.code, feature.code, existingCodes)
    : 1;
  const seq = seqOverride !== null ? seqOverride : autoSeq;
  const seqStr = String(seq).padStart(4, '0');
  const baseCode = (category && feature) ? `${category.code}${feature.code}${seqStr}` : '';
  const finalCode = suffix.trim() ? `${baseCode}-${suffix.trim().toUpperCase()}` : baseCode;
  const isDup = baseCode && isCodeDuplicate(finalCode, existingCodes);

  // 切換分類/特徵時重置流水號（讓系統重算）
  const setCat = (c) => { setCategory(c); setSeqOverride(null); };
  const setFeat = (f) => { setFeature(f); setSeqOverride(null); };

  // 儲存單一 code 到 Firestore
  const saveCode = async (kind, item) => {
    const colName = kind === 'cat' ? CATEGORY_COL : FEATURE_COL;
    const list = kind === 'cat' ? categoryCodes : featureCodes;
    const cleaned = {};
    Object.keys(item).forEach(k => { if (item[k] !== undefined) cleaned[k] = item[k]; });
    delete cleaned._docId;
    // 保留 order：若已存在就用原本的，新增的用 max+1
    const existing = list.find(c => c.code === item.code);
    if (existing && existing.order !== undefined) {
      cleaned.order = existing.order;
    } else {
      const maxOrder = list.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
      cleaned.order = maxOrder + 1;
    }
    await setDoc(doc(db, colName, item.code), cleaned);
  };

  // 拖曳排序：把 dragCode 移到 targetCode 之前
  const reorder = async (kind, dragCode, targetCode) => {
    if (dragCode === targetCode) return;
    const colName = kind === 'cat' ? CATEGORY_COL : FEATURE_COL;
    const list = kind === 'cat' ? categoryCodes : featureCodes;
    const dragIdx = list.findIndex(c => c.code === dragCode);
    const targetIdx = list.findIndex(c => c.code === targetCode);
    if (dragIdx < 0 || targetIdx < 0) return;

    // 建立新排序的陣列
    const newList = [...list];
    const [moved] = newList.splice(dragIdx, 1);
    newList.splice(targetIdx, 0, moved);

    // 重新分配 order（用 10/20/30 留間隔）
    const updates = newList.map((item, i) => ({ ...item, order: (i + 1) * 10 }));
    // 批次寫入
    for (const u of updates) {
      const cleaned = {};
      Object.keys(u).forEach(k => { if (u[k] !== undefined && k !== '_docId') cleaned[k] = u[k]; });
      await setDoc(doc(db, colName, u.code), cleaned);
    }
  };

  // 拖曳狀態
  const [draggingCode, setDraggingCode] = useState(null);
  const [dropTargetCode, setDropTargetCode] = useState(null);

  // 刪除 code（前提：沒有產品使用此 code）
  const deleteCode = async (kind, codeStr) => {
    // 檢查是否被使用
    const inUse = existingCodes.some(c => {
      const parsed = parseProductCode(c);
      if (!parsed) return false;
      return kind === 'cat' ? parsed.category === codeStr : parsed.feature === codeStr;
    });
    if (inUse) {
      alert(`「${codeStr}」已有產品使用，無法刪除。`);
      return;
    }
    if (!confirm(`確定刪除「${codeStr}」嗎？此操作無法復原。`)) return;
    const colName = kind === 'cat' ? CATEGORY_COL : FEATURE_COL;
    await deleteDoc(doc(db, colName, codeStr));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-5 my-auto max-h-[95vh] flex flex-col">
        {/* 標題 */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-base font-medium flex items-center gap-2">
              <span>✨</span>料號編碼精靈
              {editMode && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-normal">編輯模式</span>}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {editMode ? '可改備註、新增、刪除分類碼/特徵碼。可直接拖曳卡片調整順序。' : '依 COMART SOP v1.0 · 全部選項一頁顯示，可隨時更改'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditMode(!editMode)}
              title={editMode ? '結束編輯' : '編輯規則'}
              className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                editMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span>⚙</span>{editMode ? '完成' : '編輯規則'}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* 優先規則提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 text-[11px] text-amber-800 leading-relaxed">
          <strong>⚠ 優先規則：</strong>分類：與 Qi 相關優先 <strong>QIC</strong> · 特徵：車用 A+B 優先 <strong>MNT(M)</strong>、Heavy Duty 優先 <strong>HDM(H)</strong>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">

          {/* 分類碼選擇 */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-800">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-medium mr-1.5">1</span>
                分類碼（3 碼）
              </h4>
              {category && (
                <span className="text-xs text-slate-500">
                  已選：<span className="font-mono font-medium text-blue-700">{category.code}</span> · {category.label}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {categoryCodes.map(c => {
                const selected = category?.code === c.code;
                const isDragging = draggingCode === c.code;
                const isDropTarget = dropTargetCode === c.code && draggingCode !== c.code;
                return (
                  <div
                    key={c.code}
                    draggable={editMode}
                    onDragStart={(e) => {
                      if (!editMode) return;
                      setDraggingCode(c.code);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!editMode || !draggingCode) return;
                      e.preventDefault();
                      setDropTargetCode(c.code);
                    }}
                    onDragLeave={() => setDropTargetCode(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (editMode && draggingCode && draggingCode !== c.code) {
                        reorder('cat', draggingCode, c.code);
                      }
                      setDraggingCode(null);
                      setDropTargetCode(null);
                    }}
                    onDragEnd={() => { setDraggingCode(null); setDropTargetCode(null); }}
                    className={`text-left p-2 rounded-lg border-2 transition relative ${
                      selected
                        ? 'bg-blue-50 border-blue-400'
                        : isDropTarget
                        ? 'bg-blue-50 border-blue-500 border-dashed'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    } ${isDragging ? 'opacity-40' : ''} ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <button
                      onClick={() => !editMode && setCat(c)}
                      disabled={editMode}
                      className="w-full text-left"
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className={`font-mono text-xs font-medium ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{c.code}</span>
                        <span className="text-xs text-slate-800">{c.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{c.desc}</p>
                    </button>
                    {editMode && (
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          onClick={() => setEditingCat(c)}
                          title="編輯"
                          className="p-1 bg-white hover:bg-blue-50 rounded border border-slate-200 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCode('cat', c.code)}
                          title="刪除"
                          className="p-1 bg-white hover:bg-rose-50 rounded border border-slate-200 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {editMode && (
                <button
                  onClick={() => setEditingCat({ code: '', label: '', desc: '', isNew: true })}
                  className="text-left p-2 rounded-lg border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />新增分類碼
                </button>
              )}
            </div>
          </section>

          {/* 特徵碼選擇 */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-800">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-medium mr-1.5">2</span>
                特徵碼（1 字）
              </h4>
              {feature && (
                <span className="text-xs text-slate-500">
                  已選：<span className="font-mono font-medium text-emerald-700">{feature.code}</span> · {feature.full} · {feature.label}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {featureCodes.map(f => {
                const selected = feature?.code === f.code;
                const isDragging = draggingCode === 'F:' + f.code;
                const isDropTarget = dropTargetCode === 'F:' + f.code && draggingCode !== 'F:' + f.code;
                return (
                  <div
                    key={f.code}
                    draggable={editMode}
                    onDragStart={(e) => {
                      if (!editMode) return;
                      setDraggingCode('F:' + f.code);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!editMode || !draggingCode || !draggingCode.startsWith('F:')) return;
                      e.preventDefault();
                      setDropTargetCode('F:' + f.code);
                    }}
                    onDragLeave={() => setDropTargetCode(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (editMode && draggingCode && draggingCode.startsWith('F:')) {
                        const dragF = draggingCode.slice(2);
                        if (dragF !== f.code) reorder('feat', dragF, f.code);
                      }
                      setDraggingCode(null);
                      setDropTargetCode(null);
                    }}
                    onDragEnd={() => { setDraggingCode(null); setDropTargetCode(null); }}
                    className={`text-left p-2 rounded-lg border-2 transition relative ${
                      selected
                        ? 'bg-emerald-50 border-emerald-400'
                        : isDropTarget
                        ? 'bg-emerald-50 border-emerald-500 border-dashed'
                        : 'bg-white border-slate-200 hover:border-slate-400'
                    } ${isDragging ? 'opacity-40' : ''} ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    <button
                      onClick={() => !editMode && setFeat(f)}
                      disabled={editMode}
                      className="w-full text-left"
                    >
                      <div className="flex items-baseline gap-1.5">
                        <span className={`font-mono text-xs font-medium ${selected ? 'text-emerald-700' : 'text-slate-700'}`}>{f.code}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({f.full})</span>
                        <span className="text-xs text-slate-800">{f.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{f.desc}</p>
                    </button>
                    {editMode && (
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        <button
                          onClick={() => setEditingFeat(f)}
                          title="編輯"
                          className="p-1 bg-white hover:bg-emerald-50 rounded border border-slate-200 text-slate-500 hover:text-emerald-600"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteCode('feat', f.code)}
                          title="刪除"
                          className="p-1 bg-white hover:bg-rose-50 rounded border border-slate-200 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {editMode && (
                <button
                  onClick={() => setEditingFeat({ code: '', full: '', label: '', desc: '', isNew: true })}
                  className="text-left p-2 rounded-lg border-2 border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50 transition flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />新增特徵碼
                </button>
              )}
            </div>
          </section>

          {/* 流水號 + 後綴 */}
          {category && feature && (
            <section className="bg-slate-50 rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-slate-800">
                <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] font-medium mr-1.5">3</span>
                流水號與後綴
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">流水號（系統建議）</span>
                <div className="flex items-center gap-2">
                  {seqOverride !== null && (
                    <button onClick={() => setSeqOverride(null)} className="text-[10px] text-blue-600 hover:underline">
                      還原自動
                    </button>
                  )}
                  <input
                    type="number"
                    value={seq}
                    onChange={(e) => setSeqOverride(parseInt(e.target.value, 10) || 1)}
                    min="1"
                    max="9999"
                    className="font-mono text-sm font-medium text-slate-700 w-20 px-2 py-0.5 text-right border border-slate-200 rounded"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1">後綴（選用）</p>
                <div className="flex gap-1.5 flex-wrap">
                  {['', 'A', 'B', 'C', 'S'].map(s => (
                    <button
                      key={s || 'none'}
                      onClick={() => setSuffix(s)}
                      className={`text-xs px-2.5 py-1 rounded border ${
                        suffix === s
                          ? 'bg-violet-50 border-violet-400 text-violet-700 font-medium'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                      }`}
                    >
                      {s ? `-${s}` : '無'}
                    </button>
                  ))}
                  <input
                    type="text"
                    value={suffix && !['A', 'B', 'C', 'S'].includes(suffix) ? suffix : ''}
                    onChange={(e) => setSuffix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="自訂"
                    maxLength="3"
                    className="flex-1 min-w-[60px] text-xs px-2 py-1 border border-slate-200 rounded font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  -A / -B / -C：同產品不同規格 · -S：配套（Strap / Accessory）
                </p>
              </div>
            </section>
          )}

          {/* 預覽 */}
          {category && feature && (
            <div className={`rounded-lg p-4 text-center ${
              isDup ? 'bg-rose-50 border-2 border-rose-300' : 'bg-emerald-50 border-2 border-emerald-300'
            }`}>
              <p className="text-xs text-slate-500 mb-1">產生的料號</p>
              <p className="font-mono text-2xl font-bold text-slate-800 tracking-wider">{finalCode}</p>
              {isDup ? (
                <p className="text-xs text-rose-600 mt-2 font-medium">⚠ 此料號已存在，請改流水號或加後綴</p>
              ) : (
                <p className="text-xs text-emerald-700 mt-2">✓ 此料號可用</p>
              )}
            </div>
          )}

          {(!category || !feature) && (
            <div className="bg-slate-50 rounded-lg p-4 text-center text-xs text-slate-500">
              請先選擇分類碼 + 特徵碼，系統會自動產生料號
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
          <button onClick={onClose} className="text-xs px-3 py-1.5 hover:bg-slate-100 rounded text-slate-600">
            取消
          </button>
          <button
            onClick={() => onApply(finalCode)}
            disabled={isDup || !finalCode}
            className="text-sm font-medium px-4 py-1.5 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            套用此料號
          </button>
        </div>
      </div>

      {editingCat !== null && (
        <CodeEditModal
          kind="cat"
          item={editingCat}
          existingCodes={categoryCodes.map(c => c.code)}
          onSave={async (item) => { await saveCode('cat', item); setEditingCat(null); }}
          onClose={() => setEditingCat(null)}
        />
      )}

      {editingFeat !== null && (
        <CodeEditModal
          kind="feat"
          item={editingFeat}
          existingCodes={featureCodes.map(f => f.code)}
          onSave={async (item) => { await saveCode('feat', item); setEditingFeat(null); }}
          onClose={() => setEditingFeat(null)}
        />
      )}
    </div>
  );
}


function NewProjectModal({ onSave, onClose, existingCodes = [], categoryCodes = DEFAULT_CATEGORY_CODES, featureCodes = DEFAULT_FEATURE_CODES }) {
  const [showWizard, setShowWizard] = useState(false);
  const [form, setForm] = useState({
    name: '',
    code: '',
    status: '設計中',
    supplier: '',
    idDesigner: '',
    threeDDesigner: '',
    openDate: new Date().toISOString().split('T')[0],
    category: '',
    designs: { ID: [], '3D': [], BOM: [] },
    hasDFM: false,
    dfmNotes: '',
    prototypeOrders: [],
    mouldOrders: [],
    trialRuns: [],
    materialCodeStatus: '未申請',
    materialCodeNumber: '',
    trialNotes: '',
    phaseOverride: null,
    emailSubject: '',
    tags: [],
    updates: [],
    productImages: [],
    notes: '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const submit = () => {
    if (!form.name.trim()) {
      alert('請輸入品名');
      return;
    }
    // 如果類別空白但料號合規，自動帶入推算的類別
    const finalForm = { ...form };
    if (!finalForm.category && finalForm.code) {
      const derived = deriveCategoryFromCode(finalForm.code);
      if (derived) finalForm.category = derived;
    }
    onSave(finalForm);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-40 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-xl sm:rounded-xl min-h-screen sm:min-h-0 sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-medium">新增專案</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">品名 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">料號</label>
                <button
                  type="button"
                  onClick={() => setShowWizard(true)}
                  className="text-[11px] text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                >
                  <span>✨</span>自動產生
                </button>
              </div>
              <input
                type="text"
                value={form.code}
                onChange={(e) => update('code', e.target.value.toUpperCase())}
                placeholder="例：MGMS0007"
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none font-mono ${
                  form.code && isCodeDuplicate(form.code, existingCodes || [])
                    ? 'border-rose-400 bg-rose-50 focus:border-rose-500'
                    : 'border-slate-200 focus:border-slate-400'
                }`}
              />
              {form.code && isCodeDuplicate(form.code, existingCodes || []) && (
                <p className="text-[10px] text-rose-600 mt-0.5">⚠ 料號已存在</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">設計狀態</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">供應商</label>
              <input
                type="text"
                value={form.supplier}
                onChange={(e) => update('supplier', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">類別</label>
                {form.code && deriveCategoryFromCode(form.code) && (
                  <span className="text-[10px] text-slate-400">依料號自動帶入</span>
                )}
              </div>
              {(() => {
                const derived = deriveCategoryFromCode(form.code);
                const displayValue = form.category || derived;
                return (
                  <div className="relative">
                    <input
                      type="text"
                      value={displayValue}
                      onChange={(e) => update('category', e.target.value)}
                      placeholder={derived ? '（依料號自動帶入）' : '請先填料號或手動輸入'}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-slate-400 ${
                        !form.category && derived ? 'bg-blue-50/50 border-blue-200 text-blue-900' : 'border-slate-200'
                      }`}
                    />
                    {form.category && derived && form.category !== derived && (
                      <button
                        type="button"
                        onClick={() => update('category', '')}
                        title="還原為自動推算"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 hover:underline"
                      >還原自動</button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ID 設計</label>
              <input
                type="text"
                value={form.idDesigner}
                onChange={(e) => update('idDesigner', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">3D 設計</label>
              <input
                type="text"
                value={form.threeDDesigner}
                onChange={(e) => update('threeDDesigner', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">開案日</label>
            <input
              type="date"
              value={form.openDate}
              onChange={(e) => update('openDate', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            建立後可在詳細頁面上傳產品圖片、新增進度更新、加入郵件主旨（內部/客戶）、設定設計階段、加入標籤與備註。
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
          <button onClick={submit} className="px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800">建立</button>
        </div>
      </div>

      {showWizard && (
        <ProductCodeWizard
          existingCodes={existingCodes}
          categoryCodes={categoryCodes}
          featureCodes={featureCodes}
          onApply={(code) => { update('code', code); setShowWizard(false); }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}

function SaveStatusIndicator({ status }) {
  if (status === 'idle') {
    return (
      <span
        title="資料自動保存到本機瀏覽器"
        className="hidden md:flex items-center gap-1 text-[10px] text-emerald-600 px-2 py-1 rounded bg-emerald-50 border border-emerald-100"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        已保存
      </span>
    );
  }
  if (status === 'saving') {
    return (
      <span className="hidden md:flex items-center gap-1 text-[10px] text-amber-600 px-2 py-1 rounded bg-amber-50 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        保存中...
      </span>
    );
  }
  return (
    <span className="hidden md:flex items-center gap-1 text-[10px] text-emerald-700 px-2 py-1 rounded bg-emerald-100 border border-emerald-200 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
      ✓ 已保存
    </span>
  );
}

function VersionHistoryModal({ onClose }) {
  const handleResetData = () => {
    if (confirm('確定要清除所有資料嗎？\n\n這會刪除你輸入的所有專案，恢復成範例資料。\n建議先匯出 JSON 備份。\n\n此操作無法復原！')) {
      try {
        localStorage.removeItem('comart_roadmap_data');
        alert('已清除資料，頁面將重新載入。');
        window.location.reload();
      } catch (e) {
        alert('清除失敗，請手動清除瀏覽器資料。');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-lg w-full p-5 my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium">版本歷史</h3>
            <p className="text-xs text-slate-500 mt-0.5">每次迭代的功能變更紀錄</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {VERSION_HISTORY.map((v, i) => (
            <div key={v.version} className={`relative pl-5 ${i !== VERSION_HISTORY.length - 1 ? 'pb-4 border-l-2 border-slate-100 ml-1.5' : 'ml-1.5'}`}>
              <div className={`absolute -left-[7px] top-0 w-3 h-3 rounded-full ${i === 0 ? 'bg-blue-500 ring-4 ring-blue-100' : 'bg-slate-300'}`}></div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className={`font-mono text-sm font-medium ${i === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{v.version}</span>
                <span className="text-xs text-slate-400 tabular-nums">{v.date}</span>
                {i === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded font-medium">當前版本</span>}
              </div>
              <ul className="space-y-1 ml-2">
                {v.changes.map((c, j) => (
                  <li key={j} className="text-xs text-slate-600 leading-relaxed flex gap-1.5">
                    <span className="text-slate-400 flex-shrink-0">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-4 mt-2 border-t border-slate-100 space-y-2">
          <p className="text-xs text-slate-400 text-center">每次系統更新都會在此記錄變更內容</p>
          <button
            onClick={handleResetData}
            className="w-full text-[11px] text-rose-600 hover:bg-rose-50 py-1.5 rounded transition border border-rose-100"
          >
            清除所有資料並重置（建議先匯出備份）
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    const user = USERS[username.toLowerCase().trim()];
    if (!user || user.password !== password) {
      setError('帳號或密碼錯誤');
      return;
    }
    onLogin({
      username: username.toLowerCase().trim(),
      role: user.role,
      name: user.name,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-sm w-full p-8">
        <div className="text-center mb-6">
          <img src={COMART_LOGO_BASE64} alt="COMART" className="h-8 mx-auto mb-3" />
          <h1 className="text-base font-medium text-slate-900">產品進度管理系統</h1>
          <p className="text-xs text-slate-500 mt-1">請登入以繼續</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-600 mb-1">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">密碼</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                type="button"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
          >
            登入
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            管理員：<code className="bg-slate-50 px-1 rounded">nina</code> / <code className="bg-slate-50 px-1 rounded">nina2026</code><br />
            檢視者：<code className="bg-slate-50 px-1 rounded">viewer</code> / <code className="bg-slate-50 px-1 rounded">comart</code>
          </p>
        </div>
      </div>
    </div>
  );
}

function TagManagerModal({ allTags, projects, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(null);

  // 計算每個標籤被多少個專案使用
  const tagUsage = {};
  allTags.forEach(t => {
    tagUsage[t] = projects.filter(p => (p.tags || []).includes(t)).length;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-md w-full p-5 my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-medium">管理標籤</h3>
            <p className="text-xs text-slate-500 mt-0.5">刪除不再使用的標籤（會從所有相關專案中移除）</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {allTags.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">目前沒有任何標籤</p>
          ) : (
            <ul className="space-y-2">
              {allTags.map(t => (
                <li key={t} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">{t}</span>
                    <span className="text-xs text-slate-500">{tagUsage[t]} 個專案使用</span>
                  </div>
                  <button
                    onClick={() => setConfirming(t)}
                    className="text-xs text-rose-600 hover:bg-rose-50 px-2 py-1 rounded border border-rose-100"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {confirming && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-sm text-slate-700 mb-2">
              確定刪除標籤 <span className="font-medium text-rose-700">{confirming}</span>？
            </p>
            <p className="text-xs text-slate-500 mb-3">
              這會從 {tagUsage[confirming]} 個專案中移除此標籤，無法復原。
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(null)}
                className="text-xs px-3 py-1 hover:bg-white rounded"
              >取消</button>
              <button
                onClick={() => {
                  onDelete(confirming);
                  setConfirming(null);
                }}
                className="text-xs px-3 py-1 bg-rose-600 text-white rounded hover:bg-rose-700"
              >確認刪除</button>
            </div>
          </div>
        )}

        <div className="pt-3 mt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            提示：這裡只能刪除「全域標籤」。要修改單一專案的標籤，請進入該專案編輯。
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-sm w-full p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-1">確認刪除</h3>
            <p className="text-sm text-slate-500">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700">確認刪除</button>
        </div>
      </div>
    </div>
  );
}
