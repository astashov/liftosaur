#!/usr/bin/env ruby
require 'xcodeproj'

PROJECT_PATH = File.expand_path('../Liftosaur.xcodeproj', __dir__)
TARGET_NAME = 'Liftosaur'
GROUP_NAME = 'Liftosaur'
BRIDGING_HEADER_REL = 'Liftosaur/Liftosaur-Bridging-Header.h'

FILES_TO_ADD = [
  { name: 'RCTLiftosaurShare.h',    path: 'Liftosaur/RCTLiftosaurShare.h',    type: :header },
  { name: 'RCTLiftosaurShare.mm',   path: 'Liftosaur/RCTLiftosaurShare.mm',   type: :source },
  { name: 'LiftosaurShareImpl.swift', path: 'Liftosaur/LiftosaurShareImpl.swift', type: :source },
  { name: 'RCTLiftosaurTimer.h',    path: 'Liftosaur/RCTLiftosaurTimer.h',    type: :header },
  { name: 'RCTLiftosaurTimer.mm',   path: 'Liftosaur/RCTLiftosaurTimer.mm',   type: :source },
  { name: 'LiftosaurTimerImpl.swift', path: 'Liftosaur/LiftosaurTimerImpl.swift', type: :source },
  { name: 'RCTLiftosaurLiveActivity.h',  path: 'Liftosaur/RCTLiftosaurLiveActivity.h',  type: :header },
  { name: 'RCTLiftosaurLiveActivity.mm', path: 'Liftosaur/RCTLiftosaurLiveActivity.mm', type: :source },
  { name: 'LiftosaurLiveActivityImpl.swift', path: 'Liftosaur/LiftosaurLiveActivityImpl.swift', type: :source },
  { name: 'notification.m4r', path: 'Liftosaur/notification.m4r', type: :resource },
  { name: 'Liftosaur-Bridging-Header.h', path: BRIDGING_HEADER_REL, type: :header },
]

project = Xcodeproj::Project.open(PROJECT_PATH)
target = project.targets.find { |t| t.name == TARGET_NAME }
abort "Target #{TARGET_NAME} not found" unless target

group = project.main_group[GROUP_NAME]
abort "Group #{GROUP_NAME} not found" unless group

added = false
FILES_TO_ADD.each do |entry|
  basename = entry[:name]
  existing_ref = group.files.find { |f| File.basename(f.path.to_s) == basename || f.display_name == basename }
  file_ref = existing_ref || group.new_reference(entry[:path])
  if file_ref.path != entry[:path]
    file_ref.path = entry[:path]
    file_ref.name = basename
    added = true
  end

  if entry[:type] == :source
    unless target.source_build_phase.files_references.include?(file_ref)
      target.add_file_references([file_ref])
      added = true
    end
  elsif entry[:type] == :resource
    unless target.resources_build_phase.files_references.include?(file_ref)
      target.resources_build_phase.add_file_reference(file_ref, true)
      added = true
    end
  end
end

target.build_configurations.each do |config|
  bs = config.build_settings
  if bs['SWIFT_OBJC_BRIDGING_HEADER'] != BRIDGING_HEADER_REL
    bs['SWIFT_OBJC_BRIDGING_HEADER'] = BRIDGING_HEADER_REL
    added = true
  end
  if bs['SWIFT_VERSION'].nil?
    bs['SWIFT_VERSION'] = '5.0'
    added = true
  end
  if bs['CLANG_ENABLE_MODULES'] != 'YES'
    bs['CLANG_ENABLE_MODULES'] = 'YES'
    added = true
  end
  unless bs['DEFINES_MODULE'] == 'YES'
    bs['DEFINES_MODULE'] = 'YES'
    added = true
  end
end

project.save
puts added ? 'Updated Xcode project.' : 'No changes needed.'
