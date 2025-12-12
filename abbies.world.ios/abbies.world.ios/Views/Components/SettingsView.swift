//
//  SettingsView.swift
//  My First Swift
//
//  Settings dialog view
//

import SwiftUI

struct SettingsView: View {
    var onDismiss: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Settings")
                    .font(.title)
                    .fontWeight(.bold)
                    .padding(.top)
                
                // Settings content placeholder
                VStack(alignment: .leading, spacing: 16) {
                    Text("Settings options will go here")
                        .foregroundColor(.secondary)
                    
                    // Placeholder settings items
                    SettingsRow(icon: "person.fill", title: "Profile", action: {})
                    SettingsRow(icon: "bell.fill", title: "Notifications", action: {})
                    SettingsRow(icon: "paintbrush.fill", title: "Theme", action: {})
                    SettingsRow(icon: "info.circle.fill", title: "About", action: {})
                }
                .padding()
                
                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Close") {
                        onDismiss()
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

#Preview {
    SettingsView(onDismiss: {})
}

