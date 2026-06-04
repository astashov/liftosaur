#!/usr/bin/env ruby
require 'xcodeproj'

# xcodeproj 1.21.0 (system Ruby) predates Xcode's local SPM package ISA; register a stub
# so it can parse the project (QuickJSCore is referenced as a local Swift package).
module Xcodeproj
  module Constants
    if LAST_KNOWN_OBJECT_VERSION < 60
      send(:remove_const, :LAST_KNOWN_OBJECT_VERSION)
      LAST_KNOWN_OBJECT_VERSION = 60
    end
  end

  class Project
    module Object
      unless const_defined?(:XCLocalSwiftPackageReference)
        class XCLocalSwiftPackageReference < AbstractObject
          attribute :relative_path, String
        end
      end

      pkg_attr = PBXProject.attributes.find { |a| a.name == :package_references }
      pkg_attr.classes << XCLocalSwiftPackageReference if pkg_attr && !pkg_attr.classes.include?(XCLocalSwiftPackageReference)
    end
  end
end

PROJECT_PATH = File.expand_path('../Liftosaur.xcodeproj', __dir__)
TARGET_NAME = 'Liftosaur'
GROUP_NAME = 'Liftosaur'

FILES_TO_ADD = [
  { name: 'FastTextShadowNode.h',          path: 'Liftosaur/FastText/FastTextShadowNode.h',          type: :header },
  { name: 'FastTextComponentDescriptor.h', path: 'Liftosaur/FastText/FastTextComponentDescriptor.h', type: :header },
  { name: 'RCTFastTextView.h',             path: 'Liftosaur/FastText/RCTFastTextView.h',             type: :header },
  { name: 'RCTFastTextView.mm',            path: 'Liftosaur/FastText/RCTFastTextView.mm',            type: :source },
  { name: 'RCTFastTextRegistrar.h',        path: 'Liftosaur/FastText/RCTFastTextRegistrar.h',        type: :header },
  { name: 'RCTFastTextRegistrar.mm',       path: 'Liftosaur/FastText/RCTFastTextRegistrar.mm',       type: :source },
  { name: 'FastText.swift',                path: 'Liftosaur/FastText/FastText.swift',                type: :source },
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
  end
end

project.save
puts added ? 'Updated Xcode project.' : 'No changes needed.'
