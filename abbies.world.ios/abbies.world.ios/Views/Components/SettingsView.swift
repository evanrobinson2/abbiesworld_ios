//
//  SettingsView.swift
//  My First Swift
//
//  Settings dialog view
//

import SwiftUI

struct SettingsView: View {
    var onDismiss: () -> Void
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Settings")
                        .font(.title)
                        .fontWeight(.bold)
                        .padding(.top)
                    
                    // View Mode Section
                    ViewModeSection(viewModel: viewModel)
                    
                    // Other settings sections can go here
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Other Settings")
                            .font(.headline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                        
                        SettingsRow(icon: "info.circle.fill", title: "About", action: {})
                    }
                    
                    Spacer()
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        onDismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
        }
    }
}

struct SettingsRow: View {
    let icon: String
    let title: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(.blue)
                    .frame(width: 30)
                
                Text(title)
                    .foregroundColor(.primary)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 14))
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct ViewModeSection: View {
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("View Mode")
                .font(.headline)
                .padding(.horizontal)
            
            VStack(spacing: 12) {
                // View mode picker
                Picker("View Mode", selection: Binding(
                    get: { viewModel.viewMode },
                    set: { viewModel.setViewMode($0) }
                )) {
                    Text("Default").tag(ViewMode.default)
                    Text("4 Carousels").tag(ViewMode.fourCarousel)
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding(.horizontal)
                
                // Description text
                Text(viewModel.viewMode == .default 
                     ? "Standard 3-carousel layout"
                     : "Extended layout with style selection")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal)
            }
        }
    }
}

#Preview {
    // Note: Preview needs a MainViewModel instance
    SettingsView(onDismiss: {}, viewModel: MainViewModel())
}

