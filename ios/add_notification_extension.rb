require 'xcodeproj'

project_path = File.expand_path('../RaffleManiaApp.xcodeproj', __FILE__)
project = Xcodeproj::Project.open(project_path)

# Check if target already exists
existing = project.targets.find { |t| t.name == 'OneSignalNotificationServiceExtension' }
if existing
  puts 'Target already exists, skipping creation'
  exit 0
end

# Get the main app target for reference
main_target = project.targets.find { |t| t.name == 'RaffleManiaApp' }
unless main_target
  puts 'ERROR: Main target not found'
  exit 1
end

# Create the extension target
extension_target = project.new_target(:app_extension, 'OneSignalNotificationServiceExtension', :ios, '16.0')

# Set build settings
extension_target.build_configurations.each do |config|
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'org.reactjs.native.example.RaffleManiaApp.OneSignalNotificationServiceExtension'
  config.build_settings['INFOPLIST_FILE'] = 'OneSignalNotificationServiceExtension/Info.plist'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['TARGETED_DEVICE_FAMILY'] = '1,2'
  config.build_settings['GENERATE_INFOPLIST_FILE'] = 'NO'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['DEVELOPMENT_TEAM'] = main_target.build_configurations.first.build_settings['DEVELOPMENT_TEAM'] || ''
  config.build_settings['CURRENT_PROJECT_VERSION'] = '1'
  config.build_settings['MARKETING_VERSION'] = '1.0'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '16.0'
end

# Create group for extension files
extension_group = project.new_group('OneSignalNotificationServiceExtension', 'OneSignalNotificationServiceExtension')

# Add files to the group and target
swift_file_ref = extension_group.new_reference('NotificationService.swift')
extension_target.source_build_phase.add_file_reference(swift_file_ref)

plist_file_ref = extension_group.new_reference('Info.plist')

# Embed the extension in the main app
main_target.build_configurations.each do |config|
  config.build_settings['ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES'] = 'YES'
end

# Add dependency - main app depends on extension
main_target.add_dependency(extension_target)

# Add embed extension build phase
embed_phase = main_target.build_phases.find { |bp| bp.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && bp.name == 'Embed Foundation Extensions' }
unless embed_phase
  embed_phase = project.new(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase)
  embed_phase.name = 'Embed Foundation Extensions'
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
  main_target.build_phases << embed_phase
end

# Add extension product to embed phase
embed_phase.add_file_reference(extension_target.product_reference)
embed_phase.files.last.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save

puts 'Successfully added OneSignalNotificationServiceExtension target!'
puts "Targets: #{project.targets.map(&:name).join(', ')}"
