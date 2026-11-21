Pod::Spec.new do |s|
  s.name           = 'PhotoDecoder'
  s.version        = '0.1.0'
  s.summary        = 'Lokalny dekoder zdjęć z podpróbkowaniem'
  s.description    = 'Dekoduje zdjęcie tak, aby krótszy bok miał co najmniej zadany rozmiar.'
  s.homepage       = 'https://github.com/lonwi/mushroom-recognition-app'
  s.license        = { :type => 'UNLICENSED' }
  s.author         = 'Grzybobranie'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/lonwi/mushroom-recognition-app.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
