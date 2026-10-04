// Featured full-length movies. Only official uploads by the rights holders on YouTube,
// each checked for full length and for allowing playback on other sites.
export type Movie = {
  id: string;
  youtubeId: string;
  title: string;
  duration: string;
  description: string;
  source: string;
  lang: "عربي" | "عالمي";
};

export const movies: Movie[] = [
  { id: "sabaa-el-bermbah", youtubeId: "gGaozLyl-y4", title: "سبع البرمبة", duration: "1:38:57", description: "كوميديا بطولة رامز جلال ومحمد ثروت وبيومي فؤاد.", source: "Rotana Studios", lang: "عربي" },
  { id: "oaa-weshak", youtubeId: "1obs9eMxNAI", title: "اوعى وشك", duration: "1:45:57", description: "كوميديا بطولة أحمد رزق وأحمد عيد.", source: "Rotana Studios", lang: "عربي" },
  { id: "bank-el-haz", youtubeId: "omnLea1B3jc", title: "بنك الحظ", duration: "1:50:12", description: "كوميديا بطولة محمد ممدوح وأكرم حسني ومحمد ثروت.", source: "Rotana Studios", lang: "عربي" },
  { id: "omar-salma-2", youtubeId: "gr8ExWtFglY", title: "عمر وسلمى 2", duration: "1:40:39", description: "رومانسي كوميدي بطولة تامر حسني.", source: "روتانا سينما", lang: "عربي" },
  { id: "kheir-w-baraka", youtubeId: "1LZvuOn9zEQ", title: "خير وبركة", duration: "1:41:24", description: "كوميديا بطولة علي ربيع ومحمد عبد الرحمن.", source: "روتانا سينما", lang: "عربي" },
  { id: "kalem-mama", youtubeId: "CUFlewlkV54", title: "كلم ماما", duration: "1:26:52", description: "كوميديا عائلية بطولة عبلة كامل وحسن حسني ومنة شلبي.", source: "السبكي للإنتاج الفني", lang: "عربي" },
  { id: "1408", youtubeId: "ELOQ0O2kKGU", title: "1408 (2007)", duration: "1:44:24", description: "رعب وتشويق بطولة جون كيوزاك وصامويل ل. جاكسون.", source: "Lionsgate Movies", lang: "عالمي" },
  { id: "southpaw", youtubeId: "y_6zrQZRJr8", title: "Southpaw (2015)", duration: "2:03:57", description: "دراما رياضية عن ملاكم يبدأ من جديد، بطولة جيك جيلنهال.", source: "Lionsgate Movies", lang: "عالمي" },
  { id: "paper-man", youtubeId: "BDdyKWZrdng", title: "Paper Man", duration: "1:50:46", description: "كوميديا درامية بطولة رايان رينولدز وجيف دانيالز.", source: "Shout! Studios", lang: "عالمي" },
];
