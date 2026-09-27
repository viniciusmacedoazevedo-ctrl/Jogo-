import UIKit
import WebKit

/// Tela cheia na horizontal com um WKWebView que carrega o jogo
/// embutido no app (pasta "game" do bundle). Funciona sem internet.
final class GameViewController: UIViewController {
    private var webView: WKWebView!

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []   // libera o áudio do jogo
        config.websiteDataStore = .default()                   // LocalStorage persistente (progresso)

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0x15 / 255, green: 0x12 / 255, blue: 0x2B / 255, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "game") else {
            assertionFailure("pasta game/ não encontrada no app")
            return
        }
        webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    func pauseGame() {
        webView?.evaluateJavaScript(
            "try{if(BROTIM.Game.state==='playing')BROTIM.Game.togglePause();}catch(e){}",
            completionHandler: nil)
    }

    // Tela cheia de verdade: sem barra de status e com a barrinha inferior escondida
    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation { .landscapeRight }
}
