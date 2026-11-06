// Each dhikr: Arabic, transliteration, meaning, default target (0 = no target), source.
export const DHIKR = {
  astaghfir: { ar: 'أَسْتَغْفِرُ اللَّهَ', tr: 'Astaghfirullah', en: "I seek Allah's forgiveness", n: 100 },
  subhan: { ar: 'سُبْحَانَ اللَّهِ', tr: 'SubhanAllah', en: 'Glory be to Allah', n: 33 },
  hamd: { ar: 'الْحَمْدُ لِلَّهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah', n: 33 },
  akbar: { ar: 'اللَّهُ أَكْبَرُ', tr: 'Allahu Akbar', en: 'Allah is the Greatest', n: 34 },
  tahlilFull: {
    ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    tr: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ʿala kulli shayʾin qadir',
    en: 'None has the right to be worshipped but Allah alone, without partner. His is the dominion and the praise, and He has power over all things',
    n: 100, ref: 'Bukhari & Muslim',
  },
  tahlil: { ar: 'لَا إِلَٰهَ إِلَّا اللَّهُ', tr: 'La ilaha illallah', en: 'There is no god but Allah', n: 100 },
  subhanBihamdihi: { ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', tr: 'SubhanAllahi wa bihamdihi', en: 'Glory and praise be to Allah', n: 100, ref: 'Bukhari & Muslim' },
  subhanAzim: {
    ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    tr: 'SubhanAllahi wa bihamdihi, SubhanAllahil-ʿAzim',
    en: 'Glory and praise be to Allah, glory be to Allah the Magnificent', n: 100, ref: 'Bukhari & Muslim',
  },
  baqiyat: {
    ar: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَٰهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
    tr: 'SubhanAllah, walhamdulillah, wa la ilaha illallah, wallahu akbar',
    en: 'The words most beloved to Allah', n: 100, ref: 'Muslim',
  },
  hawla: { ar: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ', tr: 'La hawla wa la quwwata illa billah', en: 'There is no power and no strength except through Allah', n: 100, ref: 'Bukhari & Muslim' },
  tawbah: { ar: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', tr: 'Astaghfirullaha wa atubu ilayh', en: "I seek Allah's forgiveness and turn to Him in repentance", n: 100, ref: 'Muslim' },
  salawat: { ar: 'اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ', tr: 'Allahumma salli ʿala Muhammad wa ʿala ali Muhammad', en: 'O Allah, send blessings upon Muhammad and his family', n: 100, ref: 'Muslim' },
  yunus: { ar: 'لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ', tr: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin', en: 'There is no god but You, glory be to You; I was among the wrongdoers', n: 100, ref: 'Tirmidhi' },
  adada: {
    ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    tr: 'SubhanAllahi wa bihamdihi ʿadada khalqihi, wa rida nafsihi, wa zinata ʿarshihi, wa midada kalimatih',
    en: 'Glory and praise be to Allah, as many as His creation, as His pleasure wills, the weight of His Throne and the ink of His words', n: 3, ref: 'Muslim',
  },
  bismillah: {
    ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    tr: 'Bismillahil-ladhi la yadurru maʿasmihi shayʾun fil-ardi wa la fis-samaʾ, wa huwas-samiʿul-ʿalim',
    en: 'In the name of Allah, with whose name nothing on earth or in heaven can cause harm', n: 3, ref: 'Abu Dawud & Tirmidhi',
  },
  hasbi: {
    ar: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ، وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
    tr: 'Hasbiyallahu la ilaha illa huwa, ʿalayhi tawakkaltu, wa huwa rabbul-ʿarshil-ʿazim',
    en: 'Allah is sufficient for me; I rely on Him, Lord of the Mighty Throne', n: 7, ref: 'Abu Dawud',
  },
  audhu: { ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', tr: 'Aʿudhu bikalimatillahit-tammati min sharri ma khalaq', en: 'I seek refuge in the perfect words of Allah from the evil of what He created', n: 3, ref: 'Muslim' },
  free: { ar: 'ذِكْرُ اللَّهِ', tr: 'Free count', en: 'Count any dhikr without a target', n: 0 },
};

export const SETS = {
  salah: { name: 'After Salah', sub: 'After each of the five prayers', steps: [['astaghfir', 3], ['subhan', 33], ['hamd', 33], ['akbar', 33], ['tahlilFull', 1]] },
  morning: { name: 'Morning adhkar', sub: 'From Fajr until mid-morning', steps: [['bismillah', 3], ['hasbi', 7], ['adada', 3], ['tahlilFull', 10], ['subhanBihamdihi', 100]] },
  evening: { name: 'Evening adhkar', sub: 'From Asr until night', steps: [['bismillah', 3], ['audhu', 3], ['hasbi', 7], ['tahlilFull', 10], ['subhanBihamdihi', 100]] },
  sleep: { name: 'Before sleep', sub: 'Tasbih of Fatimah, 33 · 33 · 34', steps: [['subhan', 33], ['hamd', 33], ['akbar', 34]] },
};

export const ONES = ['subhan', 'hamd', 'akbar', 'tahlil', 'astaghfir', 'tawbah', 'subhanBihamdihi', 'subhanAzim', 'baqiyat', 'tahlilFull', 'hawla', 'salawat', 'yunus', 'free'];

// Three fixed daily tasbeeh reminders (local time).
export const DAILY = [
  { id: 'morning', hour: 9, minute: 0, title: 'Morning tasbeeh', body: 'SubhanAllahi wa bihamdihi ×100', open: 'one:subhanBihamdihi' },
  { id: 'afternoon', hour: 14, minute: 30, title: 'Afternoon istighfar', body: 'Astaghfirullah ×100', open: 'one:astaghfir' },
  { id: 'night', hour: 22, minute: 0, title: 'Before sleep', body: 'SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 34', open: 'set:sleep' },
];
