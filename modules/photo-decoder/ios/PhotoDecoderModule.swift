import ExpoModulesCore

public class PhotoDecoderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PhotoDecoder")

    AsyncFunction("decode") { (_: String, _: Int) -> [String: Any] in
      throw Exception(
        name: "PhotoDecoder",
        description: "Dekoder zdjęć nie jest jeszcze dostępny na iOS.",
        code: "unsupported"
      )
    }

    AsyncFunction("readProcessMemory") { () -> [String: Any] in
      throw Exception(
        name: "PhotoDecoder",
        description: "Dekoder zdjęć nie jest jeszcze dostępny na iOS.",
        code: "unsupported"
      )
    }
  }
}
