import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Users, Plus, Trash2, Eye } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  FamilyProfileService,
  FamilyGroupWithProfiles,
  FamilyProfile,
} from '@/services/FamilyProfileService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function FamilyProfileManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [families, setFamilies] = useState<FamilyGroupWithProfiles[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<FamilyGroupWithProfiles | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newMember, setNewMember] = useState({
    name: '',
    relationship: '',
    date_of_birth: '',
  });

  useEffect(() => {
    if (user) {
      loadFamilies();
    }
  }, [user]);

  const loadFamilies = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await FamilyProfileService.getUserFamilyGroups(user.id);
      setFamilies(data);
      if (data.length > 0 && !selectedFamily) {
        setSelectedFamily(data[0]);
      }
    } catch (error) {
      console.error('Error loading families:', error);
      Alert.alert('Error', 'Failed to load family groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!user || !newFamilyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }

    try {
      await FamilyProfileService.createFamilyGroup(user.id, newFamilyName.trim());
      setNewFamilyName('');
      setShowCreateModal(false);
      await loadFamilies();
      Alert.alert('Success', 'Family group created successfully');
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Error', 'Failed to create family group');
    }
  };

  const handleAddMember = async () => {
    if (!selectedFamily || !newMember.name.trim()) {
      Alert.alert('Error', 'Please enter a member name');
      return;
    }

    try {
      await FamilyProfileService.addFamilyProfile(selectedFamily.id, {
        name: newMember.name.trim(),
        relationship: newMember.relationship.trim() || undefined,
        date_of_birth: newMember.date_of_birth || undefined,
      });

      setNewMember({ name: '', relationship: '', date_of_birth: '' });
      setShowAddMemberModal(false);
      await loadFamilies();
      Alert.alert('Success', 'Family member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add family member');
    }
  };

  const handleDeleteMember = async (profileId: string, memberName: string) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${memberName} from the family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FamilyProfileService.deleteFamilyProfile(profileId);
              await loadFamilies();
              Alert.alert('Success', 'Family member removed');
            } catch (error) {
              console.error('Error deleting member:', error);
              Alert.alert('Error', 'Failed to remove family member');
            }
          },
        },
      ]
    );
  };

  const handleTogglePermission = async (
    profile: FamilyProfile,
    permission: 'can_view_meals' | 'can_view_reports'
  ) => {
    if (!user || !selectedFamily) return;

    try {
      const currentPermissions = await FamilyProfileService.getProfilePermissions(profile.id);

      const newPermissions = {
        can_view_meals: currentPermissions?.can_view_meals || false,
        can_view_reports: currentPermissions?.can_view_reports || false,
        can_edit_profile: currentPermissions?.can_edit_profile || false,
      };

      newPermissions[permission] = !newPermissions[permission];

      await FamilyProfileService.setProfilePermissions(
        selectedFamily.id,
        profile.id,
        user.id,
        newPermissions
      );

      Alert.alert('Success', 'Permissions updated');
    } catch (error) {
      console.error('Error updating permissions:', error);
      Alert.alert('Error', 'Failed to update permissions');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading family profiles...</Text>
      </View>
    );
  }

  if (families.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No Family Groups Yet</Text>
        <Text style={styles.emptyText}>
          Create a family group to share meal insights and track nutrition together.
        </Text>
        <Button
          title="Create Family Group"
          onPress={() => setShowCreateModal(true)}
          icon={<Plus size={20} color="#FFFFFF" />}
          style={styles.createButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Users size={24} color="#2563EB" />
            <Text style={styles.title}>Family Profiles</Text>
          </View>
          <TouchableOpacity
            style={styles.addFamilyButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={20} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* Family Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.familyTabs}>
          {families.map(family => (
            <TouchableOpacity
              key={family.id}
              style={[
                styles.familyTab,
                selectedFamily?.id === family.id && styles.familyTabActive,
              ]}
              onPress={() => setSelectedFamily(family)}
            >
              <Text
                style={[
                  styles.familyTabText,
                  selectedFamily?.id === family.id && styles.familyTabTextActive,
                ]}
              >
                {family.name}
              </Text>
              <View style={styles.memberCount}>
                <Text style={styles.memberCountText}>{family.member_count}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Selected Family */}
        {selectedFamily && (
          <>
            {/* Family Summary */}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                {FamilyProfileService.generateFamilySummary(selectedFamily)}
              </Text>
            </Card>

            {/* Add Member Button */}
            <Button
              title="Add Family Member"
              onPress={() => setShowAddMemberModal(true)}
              icon={<Plus size={20} color="#FFFFFF" />}
              style={styles.addMemberButton}
            />

            {/* Family Members */}
            {selectedFamily.profiles.map(profile => (
              <Card key={profile.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View>
                    <Text style={styles.memberName}>{profile.name}</Text>
                    {profile.relationship && (
                      <Text style={styles.memberRelationship}>{profile.relationship}</Text>
                    )}
                    {profile.date_of_birth && (
                      <Text style={styles.memberAge}>
                        {FamilyProfileService.calculateAge(profile.date_of_birth)} years old
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteMember(profile.id, profile.name)}
                  >
                    <Trash2 size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                <View style={styles.permissionsSection}>
                  <Text style={styles.permissionsTitle}>Sharing Permissions</Text>

                  <TouchableOpacity
                    style={styles.permissionRow}
                    onPress={() => handleTogglePermission(profile, 'can_view_meals')}
                  >
                    <Eye size={16} color="#6B7280" />
                    <Text style={styles.permissionText}>Can view meals</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.permissionRow}
                    onPress={() => handleTogglePermission(profile, 'can_view_reports')}
                  >
                    <Eye size={16} color="#6B7280" />
                    <Text style={styles.permissionText}>Can view reports</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {/* Educational Note */}
            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                💡 Family profiles allow meal sharing for awareness only. No medical data is
                shared. Each family member should consult their own healthcare provider for
                personalized guidance.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Create Family Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Family Group</Text>

            <TextInput
              style={styles.input}
              placeholder="Family name (e.g., Smith Family)"
              value={newFamilyName}
              onChangeText={setNewFamilyName}
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Create"
                onPress={handleCreateFamily}
                style={styles.modalButton}
              />
              <Button
                title="Cancel"
                onPress={() => {
                  setShowCreateModal(false);
                  setNewFamilyName('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={showAddMemberModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Family Member</Text>

            <TextInput
              style={styles.input}
              placeholder="Name *"
              value={newMember.name}
              onChangeText={text => setNewMember({ ...newMember, name: text })}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Relationship (e.g., Child, Spouse)"
              value={newMember.relationship}
              onChangeText={text => setNewMember({ ...newMember, relationship: text })}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Date of Birth (YYYY-MM-DD)"
              value={newMember.date_of_birth}
              onChangeText={text => setNewMember({ ...newMember, date_of_birth: text })}
              keyboardType="numbers-and-punctuation"
            />

            <View style={styles.modalButtons}>
              <Button
                title="Add Member"
                onPress={handleAddMember}
                style={styles.modalButton}
              />
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddMemberModal(false);
                  setNewMember({ name: '', relationship: '', date_of_birth: '' });
                }}
                variant="outline"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    minWidth: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  addFamilyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyTabs: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  familyTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  familyTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  familyTabText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  familyTabTextActive: {
    color: '#FFFFFF',
  },
  memberCount: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#374151',
  },
  summaryCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 22,
  },
  addMemberButton: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  memberCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  memberRelationship: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  memberAge: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionsSection: {
    gap: 12,
  },
  permissionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  disclaimer: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  disclaimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    width: '100%',
  },
});
