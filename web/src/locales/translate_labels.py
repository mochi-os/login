#!/usr/bin/env python3
"""Fill 3 empty msgstrs in all non-English Lingui PO catalogs for the login app."""

import os
import re

LOCALES_DIR = "/home/alistair/mochi/apps/login/web/src/locales"

# Translations for each msgid, keyed by locale
# Format: {locale: [fresh_account, replicate_server, restore_backup]}
TRANSLATIONS = {
    "af": ["Geen; skep 'n nuwe rekening", "Replikeer van 'n ander bediener", "Herstel 'n rugsteunlêer"],
    "am": ["ምንም; አዲስ መለያ ፍጠር", "ከሌላ ሰርቨር ቅዳ", "የምትሃት ፋይል ወደ ቀደምት ሁኔታ መልስ"],
    "ar": ["لا شيء؛ إنشاء حساب جديد", "نسخ من خادم آخر", "استعادة ملف نسخة احتياطية"],
    "ay": ["Nada; crear una cuenta nueva", "Replicar desde otro servidor", "Restaurar un archivo de copia de seguridad"],
    "az": ["Heç biri; yeni hesab yarat", "Başqa serverdən kopyala", "Ehtiyat faylını bərpa et"],
    "be": ["Нічога; стварыць новы ўліковы запіс", "Рэплікаваць з іншага сервера", "Аднавіць рэзервовы файл"],
    "bg": ["Нищо; създайте нов акаунт", "Репликиране от друг сървър", "Възстановяване на резервен файл"],
    "bho": ["कुछ नहीं; नया खाता बनाईं", "दूसरा सर्वर से रेप्लिकेट करीं", "बैकअप फाइल रिस्टोर करीं"],
    "bn": ["কিছু নয়; একটি নতুন অ্যাকাউন্ট তৈরি করুন", "অন্য সার্ভার থেকে প্রতিলিপি করুন", "একটি ব্যাকআপ ফাইল পুনরুদ্ধার করুন"],
    "bs": ["Ništa; kreirajte novi račun", "Replikujte s drugog servera", "Vratite rezervnu datoteku"],
    "ca": ["Cap; crea un compte nou", "Replica des d'un altre servidor", "Restaura un fitxer de còpia de seguretat"],
    "ckb": ["هیچ؛ هەژمارێکی نوێ دروست بکە", "لە ڕاژەیەکی دیکە کۆپی بکە", "فایلی پشتگیری ووگەڕێنەوە"],
    "cs": ["Nic; vytvořit nový účet", "Replikovat z jiného serveru", "Obnovit záložní soubor"],
    "cy": ["Dim; creu cyfrif newydd", "Atgynhyrchu o weinydd arall", "Adfer ffeil wrth gefn"],
    "da": ["Ingen; opret en ny konto", "Replikér fra en anden server", "Gendan en sikkerhedskopifil"],
    "de": ["Keine; neues Konto erstellen", "Von einem anderen Server replizieren", "Eine Sicherungsdatei wiederherstellen"],
    "de-ch": ["Keine; neues Konto erstellen", "Von einem anderen Server replizieren", "Eine Sicherungsdatei wiederherstellen"],
    "el": ["Τίποτα· δημιουργία νέου λογαριασμού", "Αναπαραγωγή από άλλον διακομιστή", "Επαναφορά αρχείου αντιγράφου ασφαλείας"],
    "es": ["Ninguna; crear una cuenta nueva", "Replicar desde otro servidor", "Restaurar un archivo de copia de seguridad"],
    "es-419": ["Ninguna; crear una cuenta nueva", "Replicar desde otro servidor", "Restaurar un archivo de copia de seguridad"],
    "es-ar": ["Ninguna; crear una cuenta nueva", "Replicar desde otro servidor", "Restaurar un archivo de copia de seguridad"],
    "et": ["Mitte midagi; loo uus konto", "Replikeerima teisest serverist", "Taastama varundusfail"],
    "eu": ["Ezer ez; sortu kontu berri bat", "Beste zerbitzari batetik erreplikatu", "Leheneratu segurtasun kopiak"],
    "fa": ["هیچ‌کدام؛ ایجاد حساب جدید", "تکثیر از سرور دیگر", "بازیابی فایل پشتیبان"],
    "fi": ["Ei mitään; luo uusi tili", "Replikoi toiselta palvelimelta", "Palauta varmuuskopiotiedosto"],
    "fr": ["Aucune; créer un nouveau compte", "Répliquer depuis un autre serveur", "Restaurer un fichier de sauvegarde"],
    "fr-ca": ["Aucune; créer un nouveau compte", "Répliquer depuis un autre serveur", "Restaurer un fichier de sauvegarde"],
    "ga": ["Dada; cruthaigh cuntas nua", "Macasamhlú ó fhreastalaí eile", "Athchóirigh comhad cúltaca"],
    "gd": ["Gin; cruthaich cunntas ùr", "Lìonmhoir bho fhrithealaiche eile", "Ath-nuadhaich faidhle cùl-taice"],
    "gl": ["Ningunha; crea unha conta nova", "Replicar desde outro servidor", "Restaurar un ficheiro de copia de seguridade"],
    "gn": ["Mba'eve; emoñe'ẽ pyahu oñepyrũ peteĩ cuenta", "Replika ambue server gui", "Ogueru mba'e'oka archivo pype"],
    "gu": ["કોઈ નહીં; નવું ખાતું બનાવો", "બીજા સર્વરથી પ્રતિકૃતિ બનાવો", "બેકઅપ ફાઇલ પુનઃસ્થાપિત કરો"],
    "ha": ["Babu; ƙirƙiri sabon lissafi", "Kwafawa daga wani uwar garke", "Maido da fayil ɗin ajiya"],
    "he": ["אין; צור חשבון חדש", "שכפל משרת אחר", "שחזר קובץ גיבוי"],
    "hi": ["कोई नहीं; एक नया खाता बनाएं", "किसी अन्य सर्वर से प्रतिकृति बनाएं", "एक बैकअप फ़ाइल पुनर्स्थापित करें"],
    "hr": ["Ništa; stvorite novi račun", "Replicirajte s drugog poslužitelja", "Vratite sigurnosnu datoteku"],
    "ht": ["Anyen; kreye yon nouvo kont", "Replike soti nan yon lòt sèvè", "Restore yon fichye backup"],
    "hu": ["Semmi; hozzon létre egy új fiókot", "Replikálás másik szerverről", "Mentési fájl visszaállítása"],
    "hy": ["Ոչ մի; ստեղծել նոր հաշիվ", "Կրկնօրինակել մեկ այլ սերվերից", "Վերականգնել կրկնօրինակ ֆայլ"],
    "id": ["Tidak ada; buat akun baru", "Replikasi dari server lain", "Pulihkan file cadangan"],
    "is": ["Ekkert; búðu til nýjan reikning", "Afrita frá öðrum þjóni", "Endurheimta öryggisafritsskrá"],
    "it": ["Nessuna; crea un nuovo account", "Replica da un altro server", "Ripristina un file di backup"],
    "ja": ["なし。新しいアカウントを作成する", "別のサーバーから複製する", "バックアップファイルを復元する"],
    "jv": ["Ora ana; gawe akun anyar", "Replika saka server liyane", "Pulihaken berkas cadangan"],
    "ka": ["არაფერი; შექმენი ახალი ანგარიში", "გაიმეორე სხვა სერვერიდან", "აღადგინე სარეზერვო ფაილი"],
    "kk": ["Ештеңе жоқ; жаңа тіркелгі жасаңыз", "Басқа серверден репликациялау", "Сақтық көшірме файлын қалпына келтіру"],
    "km": ["គ្មាន; បង្កើតគណនីថ្មី", "ចម្លងពីម៉ាស៊ីនផ្សេង", "ស្ដារឯកសារបម្រុងទុក"],
    "kn": ["ಏನೂ ಇಲ್ಲ; ಹೊಸ ಖಾತೆ ರಚಿಸಿ", "ಇನ್ನೊಂದು ಸರ್ವರ್‌ನಿಂದ ಪ್ರತಿಕ್ರಿಯಿಸಿ", "ಬ್ಯಾಕಪ್ ಫೈಲ್ ಮರುಸ್ಥಾಪಿಸಿ"],
    "ko": ["없음; 새 계정 만들기", "다른 서버에서 복제", "백업 파일 복원"],
    "ku": ["Tune; hesabek nû biafirîne", "Ji serverek din kopî bike", "Pelê piştgiriyê vegerîne"],
    "ky": ["Эч нерсе; жаңы аккаунт түзүңүз", "Башка серверден репликалоо", "Камдык файлды калыбына келтирүү"],
    "lo": ["ບໍ່ມີ; ສ້າງບັນຊີໃໝ່", "ຈໍາລອງຈາກເຊີຟເວີອື່ນ", "ກູ້ຄືນໄຟລ໌ສໍາຮອງ"],
    "lt": ["Nieko; sukurkite naują paskyrą", "Replikuoti iš kito serverio", "Atkurti atsarginės kopijos failą"],
    "lv": ["Nekas; izveidot jaunu kontu", "Replicēt no cita servera", "Atjaunot dublējumfailu"],
    "mk": ["Ништо; создадете нова сметка", "Реплицирајте од друг сервер", "Вратете резервна датотека"],
    "ml": ["ഒന്നുമില്ല; ഒരു പുതിയ അക്കൗണ്ട് സൃഷ്ടിക്കുക", "മറ്റൊരു സർവ്വറിൽ നിന്ന് പ്രതിരൂപ ഉണ്ടാക്കുക", "ഒരു ബാക്കപ്പ് ഫയൽ പുനഃസ്ഥാപിക്കുക"],
    "mn": ["Юу ч үгүй; шинэ данс үүсгэх", "Өөр серверээс хуулах", "Нөөцлөлтийн файлыг сэргээх"],
    "mr": ["काहीही नाही; नवीन खाते तयार करा", "दुसर्‍या सर्व्हरवरून प्रतिकृती बनवा", "बॅकअप फाइल पुनर्संचयित करा"],
    "ms": ["Tiada; buat akaun baharu", "Replikasi dari pelayan lain", "Pulihkan fail sandaran"],
    "mt": ["Xejn; oħloq kont ġdid", "Irreplikaw minn server ieħor", "Irrestawra fajl ta' backup"],
    "my": ["မရှိ; အကောင့်အသစ်ဖန်တီးပါ", "အခြား server မှ မိတ္တူကူးပါ", "Backup ဖိုင်ကို ပြန်လည်ရယူပါ"],
    "nb": ["Ingen; opprett en ny konto", "Replikér fra en annen server", "Gjenopprett en sikkerhetskopifil"],
    "ne": ["केही पनि छैन; नयाँ खाता बनाउनुहोस्", "अर्को सर्भरबाट प्रतिकृति गर्नुहोस्", "ब्याकअप फाइल पुनःस्थापना गर्नुहोस्"],
    "nl": ["Geen; maak een nieuw account aan", "Repliceer van een andere server", "Herstel een back-upbestand"],
    "nl-be": ["Geen; maak een nieuw account aan", "Repliceer van een andere server", "Herstel een back-upbestand"],
    "nn": ["Ingen; opprett ein ny konto", "Replikér frå ein annan tenar", "Gjenopprett ei sikkerheitskopifil"],
    "om": ["Wanti tokko miti; akkaawuntii haaraa uumi", "Serverri biraa irraa heddummeessi", "Faayilii hir'annaa deebiisi"],
    "pa": ["ਕੁਝ ਨਹੀਂ; ਨਵਾਂ ਖਾਤਾ ਬਣਾਓ", "ਕਿਸੇ ਹੋਰ ਸਰਵਰ ਤੋਂ ਰੈਪਲੀਕੇਟ ਕਰੋ", "ਬੈਕਅੱਪ ਫਾਇਲ ਰੀਸਟੋਰ ਕਰੋ"],
    "pl": ["Nic; utwórz nowe konto", "Replikuj z innego serwera", "Przywróć plik kopii zapasowej"],
    "ps": ["هیڅ نه؛ نوی حساب جوړ کړئ", "له بل سرور نه کاپي کړئ", "د بیک اپ فایل بیرته راوړئ"],
    "pt": ["Nenhuma; criar uma nova conta", "Replicar de outro servidor", "Restaurar um ficheiro de cópia de segurança"],
    "pt-br": ["Nenhuma; criar uma nova conta", "Replicar de outro servidor", "Restaurar um arquivo de backup"],
    "qu": ["Mana; Account musuqta ruwana", "Huk servermanta kopiyay", "Backup archivota kutichiyna"],
    "ro": ["Nimic; creați un cont nou", "Replicați de pe alt server", "Restaurați un fișier de rezervă"],
    "ru": ["Ничего; создать новый аккаунт", "Реплицировать с другого сервера", "Восстановить файл резервной копии"],
    "sd": ["ڪجهه به نه؛ نئون اڪائونٽ ٺاهيو", "ٻئي سرور مان نقل ڪريو", "بيڪ اپ فائل بحال ڪريو"],
    "si": ["කිසිවක් නෑ; නව ගිණුමක් සාදන්න", "වෙනත් සේවාදායකයකින් ප්‍රතිකෘතිය කරන්න", "උපස්ථ ගොනුවක් ප්‍රතිස්ථාපනය කරන්න"],
    "sk": ["Nič; vytvoriť nový účet", "Replikovať z iného servera", "Obnoviť záložný súbor"],
    "sl": ["Nič; ustvari nov račun", "Repliciraj z drugega strežnika", "Obnovi varnostno kopijo datoteke"],
    "sq": ["Asgjë; krijo një llogari të re", "Replikoni nga një server tjetër", "Rivendos një skedar rezervë"],
    "sr": ["Ништа; направите нови налог", "Реплицирај са другог сервера", "Врати резервну датотеку"],
    "su": ["Teu aya; jieun akun anyar", "Replikasi ti server séjén", "Pulihkeun file cadangan"],
    "sv": ["Ingen; skapa ett nytt konto", "Replikera från en annan server", "Återställ en säkerhetskopieringsfil"],
    "sw": ["Hakuna; unda akaunti mpya", "Nakili kutoka seva nyingine", "Rejesha faili la hifadhi"],
    "ta": ["எதுவுமில்லை; புதிய கணக்கு உருவாக்கு", "வேறு சேவையகத்திலிருந்து பிரதிலிபி செய்", "இருப்பு கோப்பை மீட்டமை"],
    "te": ["ఏమీ లేదు; కొత్త ఖాతా సృష్టించండి", "మరొక సర్వర్ నుండి రెప్లికేట్ చేయండి", "బ్యాకప్ ఫైల్‌ను పునరుద్ధరించండి"],
    "tg": ["Ҳеҷ чиз нест; ҳисоби нав эҷод кунед", "Аз сервери дигар нусхабардорӣ кунед", "Файли захиравиро барқарор кунед"],
    "th": ["ไม่มี; สร้างบัญชีใหม่", "จำลองจากเซิร์ฟเวอร์อื่น", "กู้คืนไฟล์สำรอง"],
    "tk": ["Hiç; täze hasap dör et", "Başga serwerden göçür", "Ätiýaçlyk faýlyny dikelt"],
    "tl": ["Wala; gumawa ng bagong account", "Mag-replika mula sa ibang server", "I-restore ang isang backup na file"],
    "tr": ["Hiçbiri; yeni bir hesap oluştur", "Başka bir sunucudan çoğalt", "Yedek dosyasını geri yükle"],
    "uk": ["Нічого; створити новий акаунт", "Реплікувати з іншого сервера", "Відновити файл резервної копії"],
    "ur": ["کچھ نہیں؛ نیا اکاؤنٹ بنائیں", "کسی دوسرے سرور سے نقل کریں", "بیک اپ فائل بحال کریں"],
    "uz": ["Hech narsa; yangi hisob yarating", "Boshqa serverdan replikatsiya qiling", "Zaxira faylini tiklang"],
    "vi": ["Không có; tạo tài khoản mới", "Sao chép từ máy chủ khác", "Khôi phục tệp sao lưu"],
    "xh": ["Akukho nto; yenza i-akhawunti entsha", "Phinda usebenzise kwiseva enye", "Buyisela iifayile ze-backup"],
    "yi": ["גאָרנישט; שאַפֿן אַ נייַ קאָנטע", "קאָפּירן פֿון אַן אַנדערן סערווער", "ריסטאָרירן אַ באַקאַפּ-פֿייל"],
    "yo": ["Ẹ̀yọ kankan; ṣẹda akaụnti tuntun", "Ṣe ẹda lati inu olupin miran", "Mu faili afẹyinti pada"],
    "yue": ["無；建立新帳戶", "從另一台伺服器複製", "還原備份檔案"],
    "zh-hans": ["无；创建新帐户", "从另一台服务器复制", "恢复备份文件"],
    "zh-hant": ["無；建立新帳戶", "從另一台伺服器複製", "還原備份檔案"],
    "zh-hk": ["無；建立新帳戶", "從另一台伺服器複製", "還原備份檔案"],
    "zu": ["Lutho; dala i-akhawunti entsha", "Phindaphinda kusuka komunye iseva", "Buyisela ifayela lesipele"],
}

MSGIDS = [
    "None; create a fresh account",
    "Replicate from another server",
    "Restore a backup file",
]

def fill_msgstr(content, msgid, msgstr):
    """Replace empty msgstr for a given msgid."""
    # Match msgid "..." followed by msgstr ""
    pattern = f'(msgid "{re.escape(msgid)}"\\nmsgstr )""'
    replacement = f'\\1"{msgstr}"'
    new_content, count = re.subn(pattern, replacement, content)
    return new_content, count

def process_locale(locale):
    po_path = os.path.join(LOCALES_DIR, locale, "messages.po")
    if not os.path.exists(po_path):
        return f"MISSING: {po_path}"

    if locale not in TRANSLATIONS:
        return f"NO_TRANSLATION: {locale}"

    with open(po_path, "r", encoding="utf-8") as f:
        content = f.read()

    translations = TRANSLATIONS[locale]
    changes = 0
    for i, msgid in enumerate(MSGIDS):
        content, count = fill_msgstr(content, msgid, translations[i])
        changes += count

    with open(po_path, "w", encoding="utf-8") as f:
        f.write(content)

    return f"OK({changes}): {locale}"

locales = [
    d for d in os.listdir(LOCALES_DIR)
    if os.path.isdir(os.path.join(LOCALES_DIR, d))
    and d not in ("en", "en-us", "en-ca")
]
locales.sort()

results = []
for locale in locales:
    result = process_locale(locale)
    results.append(result)
    print(result)

print(f"\nTotal locales processed: {len(locales)}")
errors = [r for r in results if not r.startswith("OK")]
if errors:
    print(f"ERRORS: {errors}")
