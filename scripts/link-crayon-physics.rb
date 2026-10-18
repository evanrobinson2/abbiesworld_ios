# Run after xcodegen generate in Games/CrayonPhysics. Idempotently links the shared framework.
require 'xcodeproj'
require 'pathname'
root = Pathname.new(__dir__).parent
host_path = root.join('abbies.world.ios/abbies.world.ios.xcodeproj')
kit_path = root.join('Games/CrayonPhysics/CrayonPhysics.xcodeproj')
host = Xcodeproj::Project.open(host_path)
kit = Xcodeproj::Project.open(kit_path)
app = host.targets.find { |t| t.name == 'abbies.world.ios' } or abort 'Host target missing'
ref = host.reference_for_path(kit_path) || host.main_group.new_reference(kit_path)
# Keep repository-relative paths in the saved project.
ref.path = kit_path.relative_path_from(host_path.parent).to_s
ref.source_tree = '<group>'
embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Crayon Physics' } || app.new_copy_files_build_phase('Embed Crayon Physics')
embed.dst_subfolder_spec = '10'
['CrayonPhysicsKit', 'CrayonPhysicsCore'].each do |name|
  framework = kit.targets.find { |t| t.name == name } or abort "Missing #{name}"
  app.add_dependency(framework)
  product = host.objects.grep(Xcodeproj::Project::Object::PBXReferenceProxy).find { |r| r.path == "#{name}.framework" } or abort "Missing proxy #{name}"
  app.frameworks_build_phase.add_file_reference(product, true)
  embed.add_file_reference(product, true).settings = {'ATTRIBUTES' => ['CodeSignOnCopy', 'RemoveHeadersOnCopy']}
end
host.save
puts "Linked CrayonPhysicsKit and Core into #{app.name}"
