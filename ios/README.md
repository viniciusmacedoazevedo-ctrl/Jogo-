# Brotim para iPhone e iPad

O app iOS é uma tela cheia na horizontal, com um `WKWebView` que carrega a pasta `game/` embutida no próprio app. Não precisa de internet. O código fica em `Sources/`, e o projeto é gerado pelo [XcodeGen](https://github.com/yonaskolb/XcodeGen) a partir do `project.yml`.

## 1. Sem Mac: .ipa pronto, compilado pelo GitHub Actions

A cada push que muda `ios/` ou `game/`, o workflow **iOS build** (`.github/workflows/ios.yml`) compila o app num Mac do GitHub. Também dá para rodar pela aba **Actions**, em **Run workflow**. O arquivo **Brotim.ipa** fica na seção *Artifacts* da execução.

O .ipa sai **sem assinatura**. A Apple não deixa instalar um app assim diretamente, então use uma destas ferramentas. As duas assinam o app com o seu Apple ID, e funciona com um Apple ID grátis:

- **[Sideloadly](https://sideloadly.io)** (Windows/Mac): conecte o iPhone no cabo, arraste o `Brotim.ipa`, digite seu Apple ID e clique em *Start*.
- **[AltStore](https://altstore.io)**: instale o AltStore no iPhone e abra o `.ipa` por ele.

Depois, no iPhone, confie no seu perfil de desenvolvedor em **Ajustes → Geral → VPN e Gerenciamento de Dispositivo**. No iOS 16 ou mais novo, ative também o **Modo de Desenvolvedor**, em Ajustes → Privacidade e Segurança.

Com Apple ID grátis, o app expira em **7 dias**: reinstale pela mesma ferramenta, e o progresso é mantido. Com o Apple Developer Program (US$ 99/ano), a assinatura vale 1 ano e dá para publicar na App Store / TestFlight.

## 2. Com Mac e Xcode

```bash
brew install xcodegen
cd ios && xcodegen generate && open Brotim.xcodeproj
```

No Xcode, escolha seu time em *Signing & Capabilities*, conecte o iPhone e aperte ▶.

## 3. Sem instalar nada: versão web (PWA)

Publique a pasta `game/` num endereço **https** (GitHub Pages, Netlify...). No iPhone, abra o endereço no **Safari**, toque em **Compartilhar → Adicionar à Tela de Início**. O jogo abre em tela cheia, com ícone próprio, e funciona offline.
