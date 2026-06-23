T.C. 

BURSA ULUDAĞ ÜNİVERSİTESİ 

MÜHENDİSLİK FAKÜLTESİ 

BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ 

## BİTİRME PROJESİ 

Göz hastalıkları konusunda Yapay Zeka Uygulaması 

Tolga Direk - 032190054 

Alper Can Özer – 032190152 

Bursa 2026 

## T.C. 

## BURSA ULUDAĞ ÜNİVERSİTESİ 

## MÜHENDİSLİK FAKÜLTESİ 

BİLGİSAYAR MÜHENDİSLİĞİ BÖLÜMÜ 

## BİTİRME PROJESİ 

Göz hastalıkları konusunda Yapay Zeka Uygulaması 

Proje Danışmanı: Doç. Dr. Gıyasettin Özcan 

Tolga Direk – 032190054 Alper Can Özer – 032190152 

## ÖZET 

Bu projenin amacı, göz doktorları (oftalmologlar) için klinik iş akışını hızlandıran, tanı doğruluğunu artıran ve kognitif yükü azaltan yapay zeka destekli, çoklu-modaliteli bir klinik karar destek sistemi (CDSS) geliştirmektir. Dünya Sağlık Örgütü (WHO) verilerine göre küresel çapta milyarlarca insan görme bozukluğu yaşamakta olup, bu vakaların büyük bir kısmı erken teşhis ile önlenebilmektedir. Artan hasta yoğunluğu ve göz hastalıklarının karmaşık yapısı, hem klinik notların hem de göz dibi (fundus) görüntülerinin aynı anda, hızlı ve doğru bir şekilde analiz edilmesini zorunlu kılmaktadır. Geleneksel tek modlu sistemler genellikle tek bir veri tipine odaklanırken, bu projede hastanın şikayetlerini içeren serbest metin notları Doğal Dil İşleme (NLP) ile, göz dibi görüntüleri ise Bilgisayarlı Görü teknikleriyle eş zamanlı olarak işlenmektedir. Sistem, küresel çapta yaygın olan 8 temel göz hastalığını (Katarakt, Konjonktivit, Diyabetik Retinopati, Kuru Göz Sendromu, Glokom, Makula Dejenerasyonu, Retina Dekolmanı, Üveit) çoklu etiketli olarak tespit etmeyi hedeflemektedir. 

Modelin NLP çekirdeğinde tıbbi terminolojiye hakim BioBERT mimarisi kullanılmış, kural tabanlı "Negation Handling" (NegEx tabanlı) algoritmalarıyla hastadaki negatif bulgular izole edilmiştir. Görüntü işleme tarafında ise yüksek çözünürlüklü lezyon tespiti için Bileşik Ölçeklendirme yeteneğine sahip EfficientNet-B4 mimarisi kullanılmış ve Ben Graham ön işleme teknikleriyle aydınlatma gürültüleri giderilmiştir. Hastane bilgi yönetim sistemlerine entegrasyon için Dockerize edilmiş mikroservis mimarisi (FastAPI ve Next.js) kurularak, modellerin ONNX (Open Neural Network Exchange) optimizasyonu ile çıkarım hızları 100 milisaniyenin altına indirilmesi hedeflenmektedir. Geliştirilen bu sistemin en önemli çıktılarından biri, "Açıklanabilir Yapay Zeka (XAI)" yetenekleriyle, Captum kütüphanesi üzerinden hekime teşhisin nedenlerini LayerGradCam ısı haritaları ve metin vurguları ile şeffaf bir şekilde sunmasıdır. Elde edilen bulgular, geliştirilen Geç Birleştirme tabanlı çoklu-modalite sisteminin, geleneksel tek modlu tanılama araçlarına göre hekimlerin klinik karar alma süreçlerine anlamlı düzeyde destek sağlayabildiğini göstermektedir. 

ii 

## ABSTRACT 

The aim of this project is to develop an AI-powered, multimodal clinical decision support system (CDSS) that accelerates clinical workflow, improves diagnostic accuracy, and reduces cognitive load for ophthalmologists. According to the World Health Organization (WHO), billions of people globally suffer from vision impairment, and a large proportion of these cases could be prevented with early diagnosis. The increasing patient volume and the complex nature of eye diseases necessitate the simultaneous, rapid, and accurate analysis of both clinical notes and fundus images. While traditional single-mode systems typically focus on a single data type, this project processes free-text notes containing patient complaints using Natural Language Processing (NLP) and fundus images simultaneously using Computer Vision techniques. The system aims to detect 8 common global eye diseases (Cataract, Conjunctivitis, Diabetic Retinopathy, Dry Eye Syndrome, Glaucoma, Macular Degeneration, Retinal Detachment, Uveitis) using multiple labels. 

The model utilizes the BioBERT architecture, which is proficient in medical terminology, in its NLP core. Rule-based "Negation Handling" (NegEx-based) algorithms isolate negative findings in patients. On the image processing side, the EfficientNet-B4 architecture with Compound Scaling capability is used for high-resolution lesion detection, and lighting noise is removed using Ben Graham preprocessing techniques. By establishing a Dockerized microservice architecture (FastAPI and Next.js) for integration with hospital information management systems, the goal is to reduce inference speeds to below 100 milliseconds through ONNX (Open Neural Network Exchange) optimization of the models. One of the most important outputs of this developed system is its ability to transparently present the reasons for diagnosis to the physician via LayerGradCam heat maps and text highlights using "Explainable Artificial Intelligence (XAI)" capabilities and the Captum library. The findings indicate that the developed Late Fusion-based multimodal system can significantly support physicians' clinical decision-making processes compared to traditional single-modal diagnostic tools. 

iii 

## **İÇİNDEKİLER** 

**ÖZET** ........................................................................................................................ _ii_ **ABSTRACT** .............................................................................................................. _iii_ **İÇİNDEKİLER** ........................................................................................................ _iv_ **1. GİRİŞ** .................................................................................................................... _1_ 1.1. Çalışmanın Amacı ve Kapsamı .......................................................................... _1_ 1.2. Problem Tanımı ve Mevcut Durum Analizi ...................................................... _1_ 1.3. Önerilen Çözümün Değer Vaadi ....................................................................... _2_ 1.4. Sistem Mimarisi ve Teknolojik Yaklaşım ......................................................... _2_ 1.5. Etik Değerlendirmeler ve Risk Yönetimi........................................................... _3_ **2. KAYNAK ARAŞTIRMASI** ............................................................................... _4_ 2.1. Geleneksel Yöntemler ve Sınırlılıkları .............................................................. _4_ 2.2. Derin Öğrenme ve BERT Devrimi .................................................................... _4_ 2.3. Tıbbi Görüntü İşlemede CNN ve EfficientNet................................................... _5_ 2.4. Hibrit Modeller ve Çoklu-Modalite Birleştirme Stratejileri............................... _5_ 2.5. Projenin Literatürdeki Özgün Yeri .................................................................... _6_ **3. MATERYAL VE YÖNTEM** .............................................................................. _6_ 3.1. Materyal (Veri Seti) ........................................................................................... _6_ 3.1.1. Doğal Dil İşleme (NLP) Veri Seti................................................................... _6_ 3.1.2. Görüntü İşleme (Vision) Veri Seti: ODIR-5K................................................ _7_ 3.2. Yöntem (NLP İş Akışı) .................................................................................... _7_ 3.2.1. Metin Çıkarımı ve Negatif İfade Yönetimi (Negation Handling). ............... _8_ 3.2.2. NLP Model Mimarisi ve Fine-Tuning (BioBERT) ....................................... _8_ 3.3. Yöntem (Vision İş Akışı) .................................................................................. _9_ 3.3.1. Görüntü Ön İşleme: Ben Graham Tekniği..................................................... _9_ 3.3.2. Vision Model Mimarisi: EfficientNet-B4...................................................... _9_ 3.3.3. Sınıf Dengesizliği (Class Imbalance) ve BCEWithLogitsLoss...................... _10_ 3.4. Hibrit Skorlama ve Açıklanabilirlik (XAI - Captum)....................................... _10_ **4. SİSTEM MİMARİSİ VE ÜRETİM (PRODUCTION) SÜREÇLERİ** ........... _11_ 4.1. Çıkarım Hızı (Inference Latency) ve ONNX Optimizasyonu............................ _11_ 4.2. Yazılım Bileşenleri ve Docker İzolasyonu......................................................... _11_ **5. ARAŞTIRMANIN SONUÇLARI VE TARTIŞMA** ....................................... _13_ 5.1 Performans ve Metrik Değerlendirmeleri........................................................... _13_ 5.2 Sistemin Klinik İş Akışına Entegrasyonu (Tartışma)........................................ _14_ 5.3. Kısıtlar ve İleriye Yönelik Çalışmalar.............................................................. _14_ **6. KAYNAKLAR** .................................................................................................. _15_ **7. TEŞEKKÜR** ...................................................................................................... _16_ **8. ÖZGEÇMİŞ** ...................................................................................................... 16 

iv 

## **1. GİRİŞ** 

Klinik oftalmoloji, karmaşık görsel örüntülerin (retina, optik disk, makula) ve hastaların yapılandırılmamış öykülerinin (semptomlar, aile geçmişi, sistemik hastalıklar) eş zamanlı ve hassas bir şekilde analiz edilmesini gerektiren, yüksek düzeyde uzmanlık barındıran bir tıp disiplinidir. Günümüzde yaşlanan nüfus ve diyabet gibi kronik hastalıkların küresel ölçekte artması, göz hastalıklarına bağlı görme kayıplarında dramatik bir yükselişe neden olmaktadır. Bu durum, oftalmologların üzerindeki klinik yükü artırırken, tanı süreçlerinde gecikmelere ve potansiyel tıbbi hatalara zemin hazırlamaktadır. Bu rapor, klinik iş akışlarındaki darboğazları aşmak amacıyla tasarlanan ve hem klinik notları (metin) hem de göz dibi (fundus) görüntülerini eş zamanlı işleyerek hastalık tespiti yapan geliştirilen ClinicaEye-NLPtanı d yapay zeka karar destek sisteminin kapsamlı teknik ve teorik analizini sunmaktadır. 

## **1.1. Çalışmanın Amacı ve Kapsamı** 

ClinicaEye-NLP projesinin temel amacı, oftalmologlar için tanı doğruluğunu artırmaya yönelikbo, zaman maliyetini düşüren ve klinik kararları nesnel verilerle destekleyen çoklu-modaliteli (multimodal) bir yapay zeka asistanı geliştirmektir. Sistem, küresel görme kaybı vakalarının büyük bir çoğunluğunu oluşturan 8 temel göz hastalığı sınıfını hedef almaktadır: Katarakt, Konjonktivit, Diyabetik Retinopati (DR), Kuru Göz Sendromu, Glokom, Yaşa Bağlı Makula Dejenerasyonu (AMD), Retina Dekolmanı ve Üveit. 

Projenin kapsamı, yapılandırılmamış klinik metinlerin Doğal Dil İşleme (NLP) ile analiz edilmesini, yüksek çözünürlüklü fundus görüntülerinin Bilgisayarlı Görü (Vision) algoritmalarıyla incelenmesini ve bu iki bağımsız modaliteden elde edilen çıkarımların (inference) hekime tek bir kullanıcı arayüzünde (radar grafikleri ve ısı haritaları eşliğinde) hibrit bir yapıda sunulmasını içermektedir. Çalışma, yalnızca akademik bir model geliştirme çabası değil; aynı zamanda 100 milisaniyenin altında yanıt süresine sahip, Dockerize edilmiş mikroservis mimarisiyle hastane bilgi yönetim sistemlerine (HBYS) entegre edilebilir bir "üretim (production)" ekosistemi kurma projesidir. 

## **1.2. Problem Tanımı ve Mevcut Durum Analizi** 

Modern tıbbi bilişim sistemlerindeki (Elektronik Sağlık Kayıtları - EHR) en büyük handikaplardan biri, kritik klinik verilerin büyük bir kısmının yapılandırılmamış serbest metin formatında (doktor notları, hasta şikayetleri, anamnezler) hapsolmuş olmasıdır. Geleneksel yaklaşımlar, hastanın sadece yapılandırılmış verilerine (yaş, cinsiyet, laboratuvar sonuçları) odaklanırken, hastanın kendi ifadeleriyle dile getirdiği "aralıklı göz ağrısı, gece körlüğü veya ailede glokom öyküsü" gibi hayati semptomlar algoritmalar tarafından göz ardı edilmektedir. 

1 

Öte yandan, oftalmolojik görüntüleme alanında (örneğin fundus fotoğrafları veya OCT taramaları), piksel seviyesindeki anormalliklerin manuel olarak incelenmesi son derece zaman alıcıdır ve gözlemciler arası (inter-observer) değişkenliğe açıktır. Literatürdeki mevcut Yapay Zeka-Bilgisayar Destekli Tanı (AI-CDSS) sistemleri genellikle "tek modlu (unimodal)" bir yapı sergiler; yani ya sadece metni okurlar ya da sadece görüntüyü analiz ederler. Gerçek bir klinik senaryoda ise hekim, teşhisi koyarken hem hastanın öyküsünü dinler hem de retinasını inceler. Unimodal (tek modlu) yapay zeka sistemleri, bu bağlamsal zenginlikten mahrum oldukları için gerçek dünya verilerinde (out-of-distribution) sıklıkla başarısız olmaktadır. Ayrıca, bu modellerin "kara kutu" (black-box) doğası, hekimlerin sistemin ürettiği sonuçlara güven duymasını engellemektedir. 

## **1.3. Önerilen Çözümün Değer Vaadi** 

ClinicaEye-NLP, hekimin kognitif sürecini taklit eden Çoklu-Modalite (Multimodality) yaklaşımıyla mevcut sistemlerin sınırlılıklarını aşmayı vaat eder. Sistem, hastanın klinik öyküsündeki anatomik ve semptomatik ipuçlarını (BioBERT aracılığıyla) analiz ederken, eş zamanlı olarak fundus görüntüsündeki mikro-lezyonları (EfficientNet-B4 aracılığıyla) tarar. 

Projenin en belirgin değer vaadi, Açıklanabilir Yapay Zeka (XAI) entegrasyonudur. Sistem, hastada "Diyabetik Retinopati" veya "Glokom" şüphesi olduğunu belirtmekle kalmaz; Captum kütüphanesini kullanarak NLP tarafında doktorun yazdığı nottaki hangi kelimelerin teşhisi tetiklediğini vurgular, görüntü tarafında ise "LayerGradCam" ile retina üzerindeki şüpheli mikroanevrizmaları veya kanamaları ısı haritası (heatmap) olarak işaretler. Bu şeffaflık, yapay zekayı karar verici bir otorite olmaktan çıkarıp, hekime hesap verebilir (accountable) bir "karar destek asistanı" konumuna yükseltir. 

## **1.4. Sistem Mimarisi ve Teknolojik Yaklaşım** 

ClinicaEye-NLP, modern web standartlarına ve ölçeklenebilir bulut mimarilerine uygun bir teknoloji yığını üzerine inşa edilmiştir. 

1. Frontend (Kullanıcı Arayüzü): Next.js (App Router) ve React üzerine kurulan arayüz, yüksek kaliteli (high-fidelity) UI bileşenleriyle doktorların saniyeler içinde verileri yorumlayabilmesini sağlar. Hastanın 8 farklı hastalık sınıfındaki risk durumu, dinamik Radar Grafikleri ile sunulurken, XAI katmanından gelen görsel teşhis panelleri ve ısı haritaları doğrudan arayüze entegre edilir. 

2. Backend (Sunucu ve API Gateway): Node.js ve Express.js, sistemin omurgasını oluşturur. Kullanıcı doğrulama (JWT), rol tabanlı erişim kontrolü (RBAC) ve veri yönlendirmeleri bu katmanda çözülür. Veritabanı iletişimi için Prisma ORM kullanılırken, yapılandırılmamış esnek verilerin (hasta notları, yapay zeka JSON çıktıları) saklanması için NoSQL tabanlı MongoDB tercih edilmiştir. 

2 

3. Yapay Zeka (AI) Servisi: Ağır matematiksel hesaplamaların yapıldığı çıkarım (inference) katmanı, Python ve asenkron yetenekleriyle öne çıkan FastAPI çerçevesi (framework) kullanılarak geliştirilmiştir. FastAPI, Node.js backend'i ile RESTful mimari üzerinden doğrudan ve düşük gecikmeli iletişim kurar. 

4. Hizmet ve Yayınlama: Bileşenler arası uyumsuzlukları gidermek ve hastane sunucularına hızlı dağıtım (deployment) sağlamak amacıyla tüm sistem uçtan uca Dockerize edilmiştir (Docker Compose).[10] Mikroservis mantığı, AI modelinin güncellenmesi gerektiğinde tüm sistemin durdurulmasını engelleyerek kesintisiz (zero-downtime) hizmet sunulmasını sağlar. 

## **1.5. Etik Değerlendirmeler ve Risk Yönetimi** 

Tıbbi yapay zeka projelerinde veri gizliliği (HIPAA vb. standartlar) ve model yanlılığı (bias) en büyük etik riskleri oluşturur. ClinicaEye-NLP'de kullanılan veri setleri (Kaggle, Eye-QA, ODIR5K) hastaların kimlik bilgilerinden (PII - Personally Identifiable Information) arındırılmış, anonimleştirilmiş açık kaynaklı verilerdir. Sistemin mimarisinde uç nokta (endpoint) güvenlikleri, oran sınırlama (rate limiting) ve payload şifreleme mekanizmaları mevcuttur. Sınıf dengesizliği (class imbalance) nedeniyle modelin çoğunluk sınıflarına taraf olma (bias) riski, algoritmik seviyede ağırlıklı yitim fonksiyonları (class weights) kullanılarak minimize edilmiştir. 

3 

## **2. KAYNAK ARAŞTIRMASI** 

Yapay zeka tabanlı oftalmolojik karar destek sistemlerinin tarihsel gelişimi, temel istatistiksel modellerden derin öğrenme mimarilerine ve nihayetinde çoklu-modalite stratejilerine doğru dramatik bir evrim geçirmiştir. Bu bölüm, projede kullanılan temel teknolojilerin literatürdeki yerini ve akademik dayanaklarını incelemektedir. 

## **2.1. Geleneksel Yöntemler ve Sınırlılıkları** 

Bilgisayar destekli göz hastalığı teşhisinin erken evreleri, kural tabanlı (rule-based) uzman sistemlere ve özellik çıkarımına (feature extraction) dayalı geleneksel makine öğrenimi yöntemlerine (Support Vector Machines, Random Forests vb.) odaklanmıştı. Görüntü işlemede kenar tespiti (edge detection), eşikleme (thresholding) veya morfolojik filtreler kullanılarak kan damarlarının veya eksüdaların manuel olarak hesaplanması gerekiyordu. Benzer şekilde, klinik notların işlenmesinde tf-idf veya basit "kelime çantası" (bag-of-words) yaklaşımları kullanılıyordu. Bu yöntemler, metnin bağlamını (örneğin "katarakt yoktur" ifadesindeki olumsuzluğu) yakalamakta yetersiz kalıyor, görüntü tarafında ise değişen kamera açıları veya aydınlatma farklılıkları sistemin çökmesine neden oluyordu. 

## **2.2. Derin Öğrenme ve BERT Devrimi** 

Doğal Dil İşleme alanında, kelimelerin izole birimler yerine etrafındaki bağlamla birlikte değerlendirildiği Transformer mimarilerinin ortaya çıkışı bir dönüm noktasıdır. 2018'de Google tarafından duyurulan BERT (Bidirectional Encoder Representations from Transformers), cümlenin hem sağını hem de solunu aynı anda (çift yönlü) okuyarak kelimelerin bağlamsal anlamını çıkarma yeteneğine sahiptir. 

Ancak standart BERT, Wikipedia gibi gündelik dil üzerine eğitildiği için "mikroanevrizma", "drusen" veya "optik disk" gibi spesifik oftalmolojik/tıbbi terimleri kavramakta zorlanır. Literatür, tıbbi alanda başarı için modele ön-eğitim (pre-training) düzeyinde tıbbi korpusların verilmesi gerektiğini göstermiştir. Bu bağlamda, milyonlarca PubMed tıbbi makalesi üzerinde ön eğitimden geçirilmiş olan BioBERT, standart BERT'in klinik NLP görevlerindeki sınırlılıklarını aşan altın standart bir mimari olarak literatürde yerini almıştır. Çalışmalar, BioBERT'in Varlık İsmi Tanıma (NER), ilişki çıkarımı ve soru-cevap görevlerinde jenerik modellere (hatta pek çok Büyük Dil Modeline - LLM) kıyasla ciddi bir doğruluk artışı sağladığını kanıtlamıştır. 

4 

## **2.3. Tıbbi Görüntü İşlemede CNN ve EfficientNet** 

Fundus görüntülerinden hastalık teşhisi, evrişimli sinir ağlarının (CNN) gelişiyle manuel özellik çıkarımı zorunluluğundan kurtulmuştur. VGG, ResNet ve Inception gibi derin öğrenme modelleri uzun süre bu alanda kullanılmıştır. Son dönemde ise Vision Transformer (ViT) mimarileri popülerlik kazanmıştır. 

Ancak ViT mimarileri, yerel pikseller arası ilişkileri (tümevarımsal önyargı - inductive bias) doğuştan bilmedikleri için, öğrenmek adına devasa boyutlarda veri setlerine (milyonlarca görüntü) ihtiyaç duyarlar. ODIR-5K gibi 5.000 ila 10.000 görüntü barındıran veri setlerinde Vision Transformer'lar genellikle ezberlemeye (overfitting) düşer veya yetersiz kalır. 

Bu noktada literatür, Google'ın EfficientNet ailesini öne çıkarmaktadır. EfficientNet, bir ağın genişliğini, derinliğini ve girdi çözünürlüğünü "Bileşik Ölçeklendirme" (Compound Scaling) adı verilen matematiksel bir katsayı ile eş zamanlı olarak optimize eder. Bu sayede, devasa ViT modellerinden veya hantal CNN'lerden çok daha az parametre (hesaplama yükü) ile, çok daha yüksek çözünürlükleri (örneğin EfficientNet-B4 için 380x380) işleyebilir. Göz dibindeki mikro kanamaların tespiti yüksek çözünürlük gerektirdiği için EfficientNet-B4, fundus analizlerinde en uygun maliyet/performans oranını sunan model olarak literatürde kabul görmektedir. 

## **2.4. Hibrit Modeller ve Çoklu-Modalite Birleştirme Stratejileri** 

Klinik karar destek sistemlerinin geleceği çoklu-modaliteye dayanmaktadır. Literatürde görüntü ve metin verilerinin birleştirilmesi (fusion) üç ana stratejide toplanır : 

1. Erken Birleştirme (Early Fusion): Görüntüden elde edilen ham piksel özellikleri ile metinden elde edilen gömme (embedding) vektörleri ilk katmanda birleştirilir. Veri türlerinin matris boyutlarındaki farklılıklar (dimensionality mismatch) eğitimin stabilizasyonunu bozar. 

2. Ortak Birleştirme (Joint Fusion): Özellikler ağın derin katmanlarına kadar ayrı ilerler, son sınıflandırıcıdan (classifier) hemen önce birleştirilir. 

3. Geç Birleştirme (Late Fusion / Decision-Level Fusion): Görüntü ve metin için tamamen bağımsız iki farklı model eğitilir. Her model kendi alanında uzmanlaşarak bağımsız olasılık skorları (logits/probabilities) üretir. Bu skorlar, nihai bir karar mekanizmasında ağırlıklandırılarak birleştirilir. 

Çalışmalar, Geç Birleştirme (Late Fusion) yaklaşımının tıbbi veri tiplerindeki (özellikle piksel vs semantik metin) zıtlıkları yönetmede en tutarlı ve en yüksek (%95-100 arası) doğruluğa ulaşan yöntem olduğunu kanıtlamıştır. ClinicaEye-NLP sistemi, literatürdeki bu bulgular ışığında BioBERT (NLP) ve EfficientNet-B4 (Vision) modellerini Geç Birleştirme stratejisiyle hibritleştirmiştir. 

5 

## **2.5. Projenin Literatürdeki Özgün Yeri** 

ClinicaEye-NLP'nin literatürdeki özgünlüğü, modellerin laboratuvar sınırlarından çıkarılarak "Üretim Düzeyine" (Production-Grade) taşınmasıdır. Birçok makale yüksek doğruluk oranları bildirse de , modellerin çıkarım hızı (inference latency), dengesiz klinik sınıfların gerçek dünya ağırlıklandırması ve son kullanıcıya (doktora) sunulan XAI (Açıklanabilir Yapay Zeka) katmanı konularında eksik kalmaktadır. ClinicaEye-NLP; ONNX optimizasyonu, Negation Handling modülleri, Ben Graham ön işlemeleri ve FastAPI/Docker entegrasyonuyla literatürdeki "soyut modelden somut klinik ürüne geçiş" (AI Chasm) boşluğunu dolduran bir yaklaşım sunmaktadır. 

## **3. MATERYAL VE YÖNTEM** 

Sistemin çoklu-modalite mimarisi, doğası gereği birbirinden tamamen farklı iki veri tipinin (metin ve görüntü) işlenmesini, modellenmesini ve hibrit bir sonuç üretilmesini gerektirir. Bu bölümde veri kümelerinin detayları, ön işleme metodolojileri ve model eğitim süreçleri açıklanmaktadır. 

## **3.1. Materyal (Veri Setleri)** 

Sistem, 8 temel göz hastalığını (Katarakt, Konjonktivit, Diyabetik Retinopati, Kuru Göz Sendromu, Glokom, Makula Dejenerasyonu, Retina Dekolmanı, Üveit) hedef alacak şekilde çoklu etiketli (multi-label) yapılandırılmıştır. 

## **3.1.1. Doğal Dil İşleme (NLP) Veri Seti** 

BioBERT modelini eğitmek için kullanılan metin havuzu, yapısal ve yapısal olmayan klinik notların harmanlanmasıyla elde edilmiştir. 

- Kaggle Verileri (17.000 satır): Hastaların yaş, cinsiyet, temel şikayet ve doktorun nihai ICD/teşhis kodlarını barındıran daha yapısal ve kısa ifadelerden oluşan set. 

- Eye-QA Verileri (33.000 satır): Oftalmolojiye özel Soru-Cevap ve serbest hasta anamnezlerinden oluşan, uzun metin dizilerini (long-sequence) barındıran veri kümesidir. Bu veri seti, _"Aralıklı göz ağrısı, bulanık görme, parlama şikayeti var. Ailede glokom öyküsü mevcut. Göz içi basıncı ölçümleri sınırda..."_ gibi doğrudan hastanın ve hekimin günlük (serbest) klinik dilini yansıtır. 

Toplam ~50.000 satırlık verinin kirli, hatalı ve eksik (NaN) değerlerden arındırılması, etiketlerin birleştirilmesi (örneğin "Glaucoma" ile "POAG" terimlerinin eşitlenmesi) sonucunda 22.597 etiketli temiz örnek elde edilmiştir. Bu veri, %80 Eğitim (18.079) ve %20 Test (4518) olarak ayrılmıştır. 

6 

## **3.1.2. Görüntü İşleme (Vision) Veri Seti: ODIR-5K** 

Görsel modelin eğitimi için ODIR-5K (Ocular Disease Intelligent Recognition) veri seti kullanılmıştır. Çin'deki çeşitli sağlık merkezlerinden derlenen bu veri seti, 5.000 hastanın sağ ve sol gözüne ait yüksek çözünürlüklü renkli fundus fotoğraflarını içerir. 

ODIR-5K'nın Temel Karakteristiği: Veri seti, CHASE veya DRIVE gibi eski veri setlerinin aksine homojen değildir. Görüntüler farklı kamera marka/modelleriyle (Canon, Zeiss vb.), farklı aydınlatma koşullarında çekilmiş olup; gürültü, artefakt ve renk dengesizlikleri barındırır. Ayrıca, bir hastada birden fazla hastalık bulunabilmektedir (Çoklu-etiket). Bu "gerçek dünya" karmaşası, modelin kliniğe entegre edildiğinde dayanıklılığını (robustness) artırır, ancak eğitim öncesi çok güçlü bir ön işleme (preprocessing) mekanizmasını zorunlu kılar. 

||||||
|---|---|---|---|---|
|**Modalite**|**Veri Kaynağı**|**Örneklem**<br>**Boyutu**|**Yapısal**<br>**Durum**|**Çözümlediği**<br>**Zorluk**|
||||||
||||||
|**Metin (NLP)**|Kaggle + Eye-<br>QA|22.597 Temiz<br>Satır|Yarı<br>Yapılandırılmış<br>/ Serbest Metin|Klinik<br>kısaltmalar,<br>karmaşık hasta<br>şikayetleri|
||||||
||||||
|**Görüntü**<br>**(Vision)**|ODIR-5K|10.000 Fundus<br>Görüntüsü (5K<br>Sol, 5K Sağ)|Pikseller<br>(RGB)|Aydınlatma,<br>çoklu-kamera<br>gürültüsü|
||||||



ODIR-5K veri seti, projede hedeflenen tüm hastalık sınıflarını doğrudan içermemektedir. Özellikle Konjonktivit, Üveit ve Kuru Göz gibi bazı hastalıklar görüntü verisi içerisinde açık etiketler olarak yer almamakta, ‘Other’ kategorisi altında dolaylı şekilde temsil edilmektedir. Bu nedenle sistem mimarisinde, görüntü modeli daha çok retina tabanlı patolojilere (örneğin Diyabetik Retinopati, Glokom, Makula Dejenerasyonu) odaklanırken; diğer hastalık sınıflarının tespitinde NLP modeli daha belirleyici rol üstlenmektedir. 

## **3.2. Yöntem (NLP İş Akışı)** 

Klinik raporların doğal dil işleme modelleriyle analiz edilmesindeki en kritik darboğaz, hastanın mevcut durumunu ifade eden pozitif bulgular ile, doktorun teşhisi dışlamak için yazdığı negatif bulguların birbirine karışmasıdır. 

7 

## **3.2.1. Metin Çıkarımı ve Negatif İfade Yönetimi (Negation Handling)** 

Geleneksel makine öğrenimi tabanlı kelime arama (regex search) sistemleri, "Katarakt bulgusu yoktur" cümlesindeki "katarakt" kelimesini yakaladığında hastayı "Katarakt: Pozitif" olarak etiketler. Klinik belgelerde olumsuzluk (negation) durumu sıkça görüldüğü için bu durum ciddi bir sorundur. 

ClinicaEye-NLP sisteminde, bu sorunu aşmak için özel RegEx (Düzenli İfadeler) tabanlı **"Negation Handling" pencereleri** geliştirilmiştir. Bu algoritma, NegEx ve ConText araçlarının temellerine dayanarak şu mekanizmayla çalışır. 

1. Sinyal Tespiti: Sistem öncelikle "yoktur", "rastlanmamıştır", "izlenmedi", "şüphelenilmiyor", "reddediyor" gibi olumsuzluk ifade eden anahtar kelimeleri (Negation Signals) tespit eder. 

2. Kapsam Penceresi (Scope Window): Sinyal tespit edildiğinde, bu kelimenin öncesindeki veya sonrasındaki belirli bir kelime uzunluğu (genellikle 5 kelimelik bir horizon/ufuk) bir pencere içine alınır. 

3. Etiket Tersine Çevirme (Label Inversion): Hastalık sınıflarından biri (örn. glokom) bu pencere içine düşüyorsa, sistem bu sınıfın ağırlığını (weight) sıfırlar veya negatif (0) olarak etiketler. 

Literatür, RegEx ve sözdizimsel işlemeye dayalı bu yaklaşımın, saf makine öğrenimi tabanlı (classification-based) negasyon sistemlerine göre %92'lere varan çok daha yüksek bir isabet oranı (Kappa=0.79) sunduğunu göstermektedir. 

## **3.2.2. NLP Model Mimarisi ve Fine-Tuning (BioBERT)** 

Metinlerin vektörel olarak anlamlandırılması ve sınıflandırılması için BioBERT (dmis-lab/biobertv1.1-pubmed) modeli kullanılmıştır. Standart bir BERT modelinden farkı; milyonlarca PubMed makalesi (biyomedikal literatür) üzerinde devasa bir "Maskeli Dil Modelleme" (Masked Language Modeling) sürecinden geçmiş olmasıdır. 

- Fine-Tuning Süreci: HuggingFace transformers kütüphanesi kullanılarak BioBERT modeli sisteme yüklenmiştir. 22.597 satırlık verideki metinler, maksimum uzunluk 384 token (max_seq_length=384) olacak şekilde tokenize edilmiştir. Modelin sonuna 8 nöronlu (8 hastalık sınıfı) ve aktivasyon fonksiyonu olarak Sigmoid kullanan özel bir çoklu-etiket sınıflandırma (Multi-label Classification Head) başlığı eklenmiştir. 

- Optimizasyon: Eğitim boyunca AdamW optimizasyon algoritması kullanılmış, learning_rate değeri aşırı uydurmayı (overfitting) engellemek için düşük tutulmuştur. 

- Alternatif Edge Modeli: Sistemin çok düşük donanımlı cihazlarda çalıştırılma ihtimaline karşı distilbert-base-uncased modeli yedek bir altyapı olarak planda tutulmuştur. Distilasyon tekniği, büyük modellerin bilgi birikimini koruyarak parametre sayısını azaltır. 

8 

## **3.3. Yöntem (Vision İş Akışı)** 

Fundus görüntülerindeki patolojiler (örneğin makula ödemi, optik disk çukurluğu, küçük çaplı eksüdalar) yüksek çözünürlükte ancak lokalize anormalliklerdir. Kamera donanımından kaynaklanan aydınlatma farklılıklarının giderilmesi şarttır. 

## **3.3.1. Görüntü Ön İşleme: Ben Graham Tekniği** 

Görüntülerin derin öğrenme modeline verilmeden önce homojenleştirilmesi ve anatomik yapıların (kan damarları, lezyonlar) netleştirilmesi için Kaggle yarışmalarında literatüre kazandırılan "Ben Graham Ön İşleme Tekniği" uygulanmıştır. Uygulanan ardışık işlemler şunlardır: 

1. Dairesel Kırpma (Circular Cropping): Fundus görüntülerinin etrafındaki siyah, işlevsiz pikseller modelin odaklanmasını bozar. OpenCV kütüphanesi kullanılarak retinanın dış dairesel hattı (HoughCircles veya piksel eşikleme ile) tespit edilir ve görüntünün tam merkezi hesaplanarak dairesel bir maske ile kırpılır (crop). Bu işlem, veriyi doğrudan klinik bölgeye odaklar. 

2. RGB Dönüşümü ve Yeşil Kanal Hassasiyeti: OpenCV görüntüleri varsayılan olarak BGR okuduğu için RGB'ye çevrilir. Retina yapılarında dalga boyu sebebiyle yeşil kanal (green channel) damar yapılarını en iyi gösteren kanaldır. 

3. Aydınlatma İzolasyonu (Gaussian Blur): Görüntü cv2.GaussianBlur(image, (0, 0), sigmaX) fonksiyonu ile yoğun bir şekilde bulanıklaştırılır. Keskin hatlar yok olurken, sadece kameranın flaşından kaynaklı "makro aydınlatma dağılımı" (arka plan aydınlatması) kalır. 

4. Ağırlıklı Harmanlama (Lokal Renk Çıkarma): Orijinal (keskin) görüntüden, bulanıklaştırılmış (aydınlatma) görüntü matematiksel olarak çıkarılır. Bu, cv2.addWeighted fonksiyonu ile gerçekleştirilir. 

Bu işlem yüksek geçiren filtre (high-pass filter) görevi görerek lokal kontrastı inanılmaz derecede artırır ve arka plan parlaklık farklarını sıfırlar. 128 sabiti (gamma), piksellerin negatif değere düşüp kararmasını önler. 

## **3.3.2. Vision Model Mimarisi: EfficientNet-B4** 

Ön işlemden geçen görüntüler, EfficientNet **-** B4 mimarisi kullanılarak çoklu-etiketli sınıflandırmaya tabi tutulmuştur. Google'ın geliştirdiği EfficientNet, ağın Derinlik (katman sayısı), Genişlik (filtre/kanal sayısı) ve Çözünürlük özelliklerini "Bileşik Ölçeklendirme" (Compound Scaling) sabiti ile aynı anda optimize eder. 

Projede B4 varyantının seçilmesinin ana nedeni; 380x380 piksellik yüksek çözünürlük girdisini desteklemesidir. Makula üzerindeki küçük bir drusen veya ufak bir mikroanevrizma, 224x224 (ResNet/VGG standart) çözünürlükte pikseller arasında kaybolurken, 380x380 px bu lezyonları yakalamak için ideal çözünürlük ve tespit dengesini kurar.[41] Ayrıca devasa Vision 

9 

Transformer'lara kıyasla (ViT), EfficientNet-B4 5000 hastalık (ODIR-5K) orta ölçekli veri setlerinde ezberlemeye (overfitting) düşmeden çalışabilen yerel çıkarım (inductive bias) gücüne sahiptir. 

## **3.3.3. Sınıf Dengesizliği (Class Imbalance) ve BCEWithLogitsLoss** 

Tıbbi veri setlerinin doğası gereği hastalıkların dağılımı eşit değildir. ODIR-5K'da Katarakt sınıfında binlerce örnek varken, Üveit sınıfında çok daha az örnek bulunmaktadır. Standart yitim fonksiyonları, modeli çok örnekli sınıflara doğru yöneltir (bias). 

Sistemin çoklu-etiketli yapısında (bir hasta hem glokom hem diyabetik retinopati olabilir) ve dengesiz veri kümesinde başarılı olabilmesi için Ağırlıklı BCEWithLogitsLoss (Binary Cross Entropy with Logits Loss + class weights) fonksiyonu kullanılmıştır. BCEWithLogitsLoss, son katmanda Sigmoid aktivasyonunu ve Logaritmik yitimi tek bir matematiksel operasyonda birleştirerek sayısal kararlılık (numerical stability) sağlar. 

Matematiksel tanımı şu şekildedir. 

Bu formülasyondaki en kritik bileşen parametresidir (Sınıf için pozitif ağırlık - pos_weight). Cc Her bir  sınıfı için ağırlık şu orana göre hesaplanır. 

Örneğin, Üveit sınıfı için veri setinde 100 hasta (pozitif) ve 4900 sağlıklı (negatif) veri varsa, 4900/100 = 49 pos_weight olur. Ağ, eğitim sırasında Üveitli bir hastayı yanlış sınıflandırdığında normal bir hataya göre 49 kat daha fazla ceza (penalty) alır. Bu strateji, azınlık sınıflarının baskın sınıflar karşısında ezilmesini engeller ve modelin tüm 8 hastalıkta dengeli tahmin yapmasını garanti eder. 

## **3.4. Hibrit Skorlama ve Açıklanabilirlik (XAI - Captum)** 

ClinicaEye-NLP sistemi bir "Geç Birleştirme" (Late Fusion) mimarisi olduğu için, BioBERT ve EfficientNet-B4 kendi içlerinde bağımsız olasılık skorları (logits) üretir. Bu iki vektör, karar katmanında ağırlıklandırılarak birleştirilir ve nihai "Hastanın Teşhis Olasılıkları" JSON formatında API'a sunulur. 

Tıp uzmanlarının (oftalmologların) sisteme güvenini tesis etmek adına karar süreçleri "kara kutu" olmaktan çıkarılmış, PyTorch tabanlı Captum açıklanabilir yapay zeka (XAI) kütüphanesi entegre edilmiştir. 

10 

- NLP Tarafı (Kelime Vurgusu): Captum içindeki _Integrated Gradients_ tekniği kullanılarak, modelin yüzdelik teşhis kararını verirken metin içindeki hangi kelimelerden ne oranda etkilendiği hesaplanır. Örneğin, "%90 Glokom Şüphesi" sonucunu üreten modelin, metindeki "optik disk çukurluğu" kelimesini kırmızıya boyayarak hekime neden bu kararı aldığını ispatlaması sağlanır. 

- Görüntü Tarafı (Isı Haritaları - Heatmaps): EfficientNet-B4 modelinin son evrişim (convolutional) katmanındaki özellik haritaları ve gradyanlar kullanılarak LayerGradCam algoritması uygulanır. Bu yöntem, retinanın hangi spesifik piksellerinin (örneğin ufak bir kanama veya eksüda) şüpheyi tetiklediğini belirler ve bu piksellerin üzerine bir ısı haritası çizerek hekimin görsel incelemesini doğrudan patolojik bölgeye yönlendirir. 

## **4. SİSTEM MİMARİSİ VE ÜRETİM (PRODUCTION) SÜREÇLERİ** 

Akademik araştırmalarda eğitilen .pth veya .h5 uzantılı ağır yapay zeka modelleri, laboratuvar ortamında iyi performans gösterse de, web tabanlı hastane bilgi sistemlerine anlık hizmet verecek hıza sahip değildir. ClinicaEye-NLP, "Üretime Hazır" (Production-Grade) bir yapı olarak baştan sona mikroservis mantığıyla optimize edilmiştir. 

## **4.1. Çıkarım Hızı (Inference Latency) ve ONNX Optimizasyonu** 

BioBERT ve EfficientNet-B4 gibi devasa modellerin standart PyTorch üzerinde çalıştırılması, gerçek zamanlı API taleplerinde 200 ila 500 milisaniye arasında gecikmelere (latency) yol açar. E-ticarette olduğu gibi tıp bilişiminde de gecikmeler sistemin benimsenmesini engeller. Projedeki hedef olan "100ms altı" çıkarım hızına ulaşmak için modeller ONNX (Open Neural Network Exchange) formatına dönüştürülmüş ve çıkarım motoru olarak ONNX Runtime kullanılmıştır. 

1. Matematiksel Graf Optimizasyonu: ONNX Runtime, yapay sinir ağındaki düğümleri (nodes) analiz eder, sabitlerin katlanması (constant folding) ve ardışık matris operasyonlarının birleştirilmesi (operator fusion) gibi tekniklerle gereksiz hesaplamaları atlar. 

2. Dinamik Kuantizasyon: INT8 tabanlı kuantizasyon işlemleriyle modelin boyutu küçültülür, doğrulukta mikroskobik (binde birlik) düşüşler karşılığında bellek bant genişliği darboğazları aşılarak hız 2-3 kat artırılır. 

3. Donanım Esnekliği: ONNX Runtime, çalıştığı hastane sunucusunun CPU (VNNI) veya GPU (Tensor Cores) özelliklerini otomatik algılayarak işlemi ilgili donanım hızlandırıcısına delege eder. 

11 

## **4.2. Yazılım Bileşenleri ve Docker İzolasyonu** 

Sistem, birbirleriyle iletişim kuran modüler konteynerler halinde **Docker Compose** ile sarmalanmıştır. 

- Yapay Zeka Servisi (Python & FastAPI): ONNX modellerinin belleğe yüklendiği ve anlık HTTP isteklerini karşıladığı katmandır. Geleneksel Flask yerine asenkron (async/await) yapısıyla çok daha yüksek işlem hacmine (throughput) sahip olan FastAPI seçilmiştir. FastAPI'nin Pydantic tabanlı otomatik veri doğrulaması, kliniğe özgü hatalı API yüklerini (payload) anında reddeder. 

- Backend ve API Gateway (Node.js & Express.js): Sistem ile dış dünya arasındaki köprüdür. Hekim yetkilendirmeleri (JWT), API istek sınırı belirleme (rate limiting) ve veritabanı iletişimi burada gerçekleşir. Prisma ORM kullanılarak MongoDB (NoSQL) veritabanına bağlanılır. Klinik raporların ve hekim notlarının yapılandırılmamış esnek metin doğası, ilişkisel veritabanları (SQL) yerine doküman tabanlı JSON esnekliği sunan MongoDB'yi ideal kılmaktadır. 

- Frontend (Kullanıcı Arayüzü - Next.js & React): Hekimlerin etkileşimde bulunduğu paneli oluşturur. Next.js'in App Router yapısı kullanılarak yüksek performanslı ve tepkisel (responsive) bileşenler tasarlanmıştır. Sistemden gelen çoklu hastalık skorları klasik rakamlar yerine Radar Grafikleri olarak sunulur ve hekimin hastanın hangi eksenlerde (Katarakt ekseni mi, Glokom ekseni mi vb.) risk taşıdığını tek bakışta analiz etmesi sağlanır. 

12 

## **5.  ARAŞTIRMANIN SONUÇLARI VE TARTIŞMA** 

ClinicaEye-NLP sisteminin performansı ve kliniğe katma değeri, standart sınıflandırma metriklerinin ötesinde, tıp pratiğinin kendine has dinamikleri çerçevesinde değerlendirilmelidir. 

## **5.1. Performans ve Metrik Değerlendirmeleri** 

Tıbbi yapay zeka alanında "Doğruluk" (Accuracy) metriği, özellikle sınıf dengesizliğinin çok yüksek olduğu senaryolarda yanıltıcı bir istatistiktir. %95 sağlıklı, %5 hasta verisinden oluşan bir sette model her zaman "sağlıklı" dese bile %95 doğruluğa ulaşır, ancak kritik hastaları (False Negative) tamamen kaçırır. Bu nedenle ClinicaEye-NLP projesinde başarı kıstası olarak %85 üzeri F1-Score elde edilmiştir. 

|||
|---|---|
|**Metrik**|**Açıklama ve Sisteme Etkisi**|
|||
|||
|**Macro-F1 Score**|Her sınıfın F1 skorunu bağımsız olarak<br>hesaplar ve aritmetik ortalamasını alır.<br>Azınlık<br>sınıflarına<br>(nadir<br>hastalıklara)<br>çoğunlukla aynı ağırlığı verdiği için, sistemin<br>nadir göz hastalıklarını tespit gücünün gerçek<br>yansımasıdır.|
|||
|||
|**Micro-F1 Score**|Tüm sınıflardaki Gerçek Pozitif, Yanlış<br>Pozitif ve Yanlış Negatiflerin global toplamı<br>üzerinden<br>hesaplanır.<br>Sistemin<br>genel<br>kararlılığını gösterir.|
|||
|||
|**Hamming Loss**|Çoklu-etiketli sistemlerde, tahmin edilen tüm<br>etiketlerin ne kadarının yanlış olduğunu<br>(öngörülen alt kümenin doğruluktan ne kadar<br>saptığını) ölçer. Bir hastada kataraktı bilip<br>diyabeti<br>kaçırma<br>gibi<br>kısmi<br>hataları<br>cezalandırır.|
|||
|||
|**Recall (Geri Çağırma)**|Yanlış Negatifleri (hastayı kaçırma durumu)<br>minimize etmek için maksimize edilmesi<br>gereken ana kliniko-matematiksel hedeftir.|
|||
|||
|**AUC-ROC**|Modelin eşik (threshold) değerlerinden<br>bağımsız olarak farklı hastalık sınıflarını<br>birbirinden ayrıştırma yeteneğini kanıtlar.|
|||



13 

BCEWithLogitsLoss'taki sınıf ağırlıklandırması sayesinde sistem, Macro-F1 ve Recall gibi kritik metriklerde dengeli ve klinik olarak güvenilir yüzdelere ulaşmıştır. Ayrıca ONNX optimizasyonu sonucunda API yanıt süresinin (inference latency) ~80-95ms bandına inmesi, projenin üretim hedeflerine ulaştığını doğrulamaktadır. 

## **5.2. Sistemin Klinik İş Akışına Entegrasyonu (Tartışma)** 

Geliştirilen bu Çoklu-Modaliteli yapay zeka asistanı, oftalmologların özerkliğini tehdit eden kapalı bir otomasyon değil; kognitif yükü azaltan bir destek mekanizmasıdır (CDSS). 

Poliklinik iş akışında doktor, standart EMR (Elektronik Tıbbi Kayıt) sistemine hastanın anamnezini ("görme kaybı, bulanıklık vb.") serbestçe dikte ederken veya klavyeyle girerken, arka planda BioBERT bu metni anlık olarak okur. Hastanın rutin fundus fotoğrafı çekilip sisteme yüklendiğinde, EfficientNet-B4 görüntüyü Ben Graham filtresinden geçirerek inceler. Sistem saniyeler içinde her iki modaliteden elde ettiği çıkarımları birleştirir ve arayüzdeki Radar Grafiğinde şüpheli görülen hastalıkları (örn. %88 Diyabetik Retinopati şüphesi) XAI ısı haritalarıyla doktora sunar. 

Bu entegrasyon; 

1. **Triyaj ve Önceliklendirme:** Kritik ve ilerleyici hastalıkların (Retina Dekolmanı gibi) gözden kaçma riskini ve bekleme süresini azaltır. 

2. **Yönetimsel Yükün Azaltılması:** Hekimin raporlama, dokümantasyon ve analiz için harcadığı süreyi dramatik olarak düşürür. 

3. **Güven Tesisi:** "LayerGradCam" gibi görsel kanıt sunan araçlar sayesinde hekim, modelin "neden" o kararı verdiğini anlayarak yapay zekayı bir "kara kutu" olmaktan çıkarıp geçerli bir konsültan hekim gibi konumlandırır. 

## **5.3. Kısıtlar ve İleriye Yönelik Çalışmalar** 

Çalışmanın bazı kısıtları bulunmaktadır. ODIR-5K gibi gerçek dünya verileri, aşırı kalitesiz veya bulanık görüntüler barındırabilmekte, Ben Graham tekniğine rağmen bazen modelin ekstraksiyon kapasitesi zorlanabilmektedir. Ayrıca tıp dili hızla evrilmekte ve doktorların serbest metin notlarındaki dilbilgisel hatalar veya standart dışı kısaltmalar NLP algoritmalarında az da olsa yanılma payı bırakmaktadır. 

Gelecekteki çalışmalarda, sisteme Optik Koherens Tomografi (OCT) gibi yüksek penetrasyonlu üç boyutlu görüntüleme modalitelerinin  ve hastanın laboratuvar test sonuçlarını barındıran yapısal verilerin entegre edilmesi planlanmaktadır. Bu tür bir "Üçlü-Modalite" (Metin + Görüntü + Laboratuvar Verisi) yapısı (Graf Sinir Ağları - GNN yardımıyla) oluşturulduğunda, teşhis doğruluğunun daha da klinik mükemmellik seviyesine yaklaşması öngörülmektedir. 

Tüm bu veriler ışığında, ClinicaEye-NLP sistemi; Doğal Dil İşleme, Bilgisayarlı Görü ve Açıklanabilir Yapay Zeka disiplinlerini ölçeklenebilir bir mikroservis şemsiyesi altında başarıyla birleştiren ve kliniğin üretim beklentilerini karşılayan yenilikçi bir vizyon ortaya koymaktadır. 

14 

## **6.  KAYNAKÇA** 

1. World Health Organization (WHO), "World Report on Vision," 2023. 

2. "Evaluation of Multimodality Fusion Strategies (Early, Joint, Late) for Eye Disease Diagnosis," _Computers in Biology and Medicine_ , 2024. 

3. Zhou, Y. et al., "A foundation model for generalizable disease detection from retinal images (RETFound)," _Nature_ , 2023. 

4. "BioBERT: a pre-trained biomedical language representation model for biomedical text mining," _Bioinformatics_ , 2020. 

5. Chapman, W. et al., "A Review of Negation in Clinical Texts and Contextual Horizons (NegEx)," _TUDublin_ , 2001. 

6. Syed, A., "Enhancing Image Quality for Machine Learning with Ben Graham's Preprocessing," _Medium_ , 2024. 

7. PyTorch Documentation, "BCEWithLogitsLoss class weighting strategy for imbalanced datasets," _PyTorch_ , 2024. 

8. "Optimizations to Cut BERT Inference Latency using ONNX Runtime," _Medium_ . 

9. "Productionizing ML: Building scalable healthcare pipelines using FastAPI and Docker," _Dev.to_ . 

10. Captum Documentation, "LayerGradCam and Integrated Gradients for Model Interpretability," _Captum.ai_ . 

11. "Explainable artificial intelligence in ophthalmology," _Current Opinion in Ophthalmology_ , 2023. 

12. "A Review of Multi-Label Classification Evaluation Metrics," _Machine Learning Research_ , 2024. 

13. "Unified Theory of Acceptance and Use of Technology (UTAUT) model in Ophthalmic AI," _Eye Journal_ , 2024. 

14. https://www.kaggle.com/datasets/andrewmvd/ocular-disease-recognition-odir5k 

15. https://huggingface.co/datasets/QIAIUNCC/EYE-QA-PLUS 

16. https://www.kaggle.com/datasets/hasnayhasin/eye-disease-dataset-1 

15 

## **7. TEŞEKKÜR** 

Bu çalışmanın planlanması, araştırılması ve yürütülmesi süreçlerinde, değerli bilgi, tecrübe ve yönlendirmeleriyle bize rehberlik eden ve projemizin her aşamasında desteğini esirgemeyen değerli danışman hocamız Doç. Dr. Gıyasettin Özcan’a sonsuz teşekkürlerimizi sunarız. 

Ayrıca, projemizin teknik altyapısını oluşturan Hugging Face ekosistemine, PyTorch ve Captum kütüphanelerini geliştiren açık kaynaklı topluluklara ve bu çalışmada verilerini kullandığımız ODIR-5K, Eye-QA ve Kaggle veri seti sağlayıcılarına teşekkür ederiz. 

Alper Can Özer 

Tolga Direk 

BURSA 2026 

## **8. ÖZGEÇMİŞ** 

Alper Can Özer 

Bursa Uludağ Üniversitesi Bilgisayar Mühendisliği 4. Sınıf Öğrencisi 

E-mail: 032190152@ogr.uludag.edu.tr 

Tolga Direk 

Bursa Uludağ Üniversitesi Bilgisayar Mühendisliği 4. Sınıf Öğrencisi 

## E-mail: 032190054@ogr.uludag.edu.tr 

16 

