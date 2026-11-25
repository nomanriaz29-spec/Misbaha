Pod::Spec.new do |s|
  s.name           = 'RatbPlaces'
  s.version        = '1.0.0'
  s.summary        = 'Finds nearby mosques with Apple Maps for Ratb'
  s.description    = 'A small Expo module wrapping MKLocalSearch to list mosques near a location.'
  s.author         = 'Noman Riaz'
  s.homepage       = 'https://github.com/nomanriaz29-spec/Misbaha'
  s.license        = { type: 'MIT' }
  s.platforms      = { ios: '15.1' }
  s.source         = { git: 'https://github.com/nomanriaz29-spec/Misbaha.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MapKit', 'CoreLocation'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
