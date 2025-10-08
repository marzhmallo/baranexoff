
import { supabase } from '@/integrations/supabase/client';

export interface Relationship {
  id: string;
  resident_id: string;
  related_resident_id: string;
  relationship_type: string;
  created_at: string;
  related_resident?: {
    id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    suffix?: string;
  };
}

// Get all relationships for a specific resident
export const getResidentRelationships = async (residentId: string) => {
  try {
    const { data, error } = await supabase
      .from('relationships')
      .select(`
        *,
        related_resident:residents!relationships_related_resident_id_fkey(
          id,
          first_name,
          last_name,
          middle_name,
          suffix
        )
      `)
      .eq('resident_id', residentId);

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Error fetching relationships:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Add a new relationship
export const addRelationship = async (residentId: string, relatedResidentId: string, relationshipType: string) => {
  try {
    console.log('Adding relationship:', { residentId, relatedResidentId, relationshipType });
    
    // Check if relationship already exists
    const { data: existingRelationship } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', residentId)
      .eq('related_resident_id', relatedResidentId)
      .eq('relationship_type', relationshipType)
      .single();

    if (existingRelationship) {
      return { success: false, error: 'This relationship already exists' };
    }

    // First, add the direct relationship
    const { data: directRelationship, error: directError } = await supabase
      .from('relationships')
      .insert({
        resident_id: residentId,
        related_resident_id: relatedResidentId,
        relationship_type: relationshipType
      })
      .select()
      .single();

    if (directError) throw directError;
    console.log('Direct relationship added:', directRelationship);

    // Add the reverse relationship
    const reverseRelationshipType = getReverseRelationshipType(relationshipType);
    console.log('Reverse relationship type:', reverseRelationshipType);
    
    if (reverseRelationshipType) {
      // Check if reverse relationship already exists
      const { data: existingReverse } = await supabase
        .from('relationships')
        .select('*')
        .eq('resident_id', relatedResidentId)
        .eq('related_resident_id', residentId)
        .eq('relationship_type', reverseRelationshipType)
        .single();

      if (!existingReverse) {
        const { data: reverseRelationship, error: reverseError } = await supabase
          .from('relationships')
          .insert({
            resident_id: relatedResidentId,
            related_resident_id: residentId,
            relationship_type: reverseRelationshipType
          })
          .select()
          .single();

        if (reverseError) {
          console.error('Error adding reverse relationship:', reverseError);
        } else {
          console.log('Reverse relationship added:', reverseRelationship);
        }
      }
    }

    // Handle automatic relationship inference
    await inferAutomaticRelationships(residentId, relatedResidentId, relationshipType);

    return { success: true, data: directRelationship };
  } catch (error: any) {
    console.error('Error adding relationship:', error);
    return { success: false, error: error.message };
  }
};

// Delete a relationship
export const deleteRelationship = async (relationshipId: string) => {
  try {
    // Get the relationship details first
    const { data: relationship, error: getError } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationshipId)
      .single();

    if (getError) throw getError;

    // Delete the main relationship
    const { error: deleteError } = await supabase
      .from('relationships')
      .delete()
      .eq('id', relationshipId);

    if (deleteError) throw deleteError;

    // Delete the reverse relationship
    const reverseRelationshipType = getReverseRelationshipType(relationship.relationship_type);
    if (reverseRelationshipType) {
      await supabase
        .from('relationships')
        .delete()
        .eq('resident_id', relationship.related_resident_id)
        .eq('related_resident_id', relationship.resident_id)
        .eq('relationship_type', reverseRelationshipType);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting relationship:', error);
    return { success: false, error: error.message };
  }
};

// Get reverse relationship type - improved mapping
const getReverseRelationshipType = (relationshipType: string): string | null => {
  const reverseMap: { [key: string]: string } = {
    'father': 'child',
    'mother': 'child', 
    'parent': 'child',
    'child': 'parent',
    'son': 'parent',
    'daughter': 'parent',
    'brother': 'sibling',
    'sister': 'sibling',
    'sibling': 'sibling',
    'husband': 'wife',
    'wife': 'husband',
    'spouse': 'spouse',
    'grandfather': 'grandchild',
    'grandmother': 'grandchild',
    'grandchild': 'grandparent',
    'grandson': 'grandparent',
    'granddaughter': 'grandparent',
    'uncle': 'nephew/niece',
    'aunt': 'nephew/niece',
    'nephew': 'uncle/aunt',
    'niece': 'uncle/aunt',
    'cousin': 'cousin'
  };

  return reverseMap[relationshipType.toLowerCase()] || null;
};

// Infer automatic relationships based on existing ones
const inferAutomaticRelationships = async (residentId: string, relatedResidentId: string, relationshipType: string) => {
  try {
    console.log('Inferring automatic relationships for:', { residentId, relatedResidentId, relationshipType });
    
    // Get existing relationships for both residents
    const { data: resident1Relationships } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', residentId);

    const { data: resident2Relationships } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', relatedResidentId);

    if (!resident1Relationships || !resident2Relationships) return;

    // Handle sibling relationships
    if (['brother', 'sister', 'sibling'].includes(relationshipType.toLowerCase())) {
      await inferSiblingRelationships(residentId, relatedResidentId, resident1Relationships, resident2Relationships);
    }

    // Handle parent-child relationships
    if (['father', 'mother', 'parent'].includes(relationshipType.toLowerCase())) {
      await inferParentChildRelationships(residentId, relatedResidentId, resident1Relationships, resident2Relationships);
    }

    // Handle child-parent relationships
    if (['child', 'son', 'daughter'].includes(relationshipType.toLowerCase())) {
      await inferChildParentRelationships(residentId, relatedResidentId, resident1Relationships, resident2Relationships);
    }

  } catch (error) {
    console.error('Error inferring automatic relationships:', error);
  }
};

// Infer relationships when siblings are connected
const inferSiblingRelationships = async (resident1Id: string, resident2Id: string, resident1Rels: any[], resident2Rels: any[]) => {
  console.log('Inferring sibling relationships');
  
  // Find parents of resident1
  const resident1Parents = resident1Rels.filter(rel => 
    ['father', 'mother', 'parent'].includes(rel.relationship_type.toLowerCase())
  );

  // Find parents of resident2
  const resident2Parents = resident2Rels.filter(rel => 
    ['father', 'mother', 'parent'].includes(rel.relationship_type.toLowerCase())
  );

  console.log('Resident1 parents:', resident1Parents);
  console.log('Resident2 parents:', resident2Parents);

  // Add any missing parent relationships to resident2
  for (const parent1 of resident1Parents) {
    const hasRelationship = resident2Parents.some(parent2 => 
      parent2.related_resident_id === parent1.related_resident_id
    );

    if (!hasRelationship) {
      console.log('Adding parent relationship to resident2:', parent1.related_resident_id);
      await addParentChildRelationshipPair(resident2Id, parent1.related_resident_id, parent1.relationship_type);
    }
  }

  // Add any missing parent relationships to resident1
  for (const parent2 of resident2Parents) {
    const hasRelationship = resident1Parents.some(parent1 => 
      parent1.related_resident_id === parent2.related_resident_id
    );

    if (!hasRelationship) {
      console.log('Adding parent relationship to resident1:', parent2.related_resident_id);
      await addParentChildRelationshipPair(resident1Id, parent2.related_resident_id, parent2.relationship_type);
    }
  }
};

// Infer relationships when parent-child connection is made
const inferParentChildRelationships = async (parentId: string, childId: string, parentRels: any[], childRels: any[]) => {
  console.log('Inferring parent-child relationships - parent:', parentId, 'child:', childId);
  
  // Find other children of the parent
  const otherChildren = parentRels.filter(rel => 
    ['child', 'son', 'daughter'].includes(rel.relationship_type.toLowerCase()) &&
    rel.related_resident_id !== childId
  );

  console.log('Other children of parent:', otherChildren);

  // Make all other children siblings of the new child
  for (const sibling of otherChildren) {
    await addSiblingRelationshipPair(childId, sibling.related_resident_id);
  }

  // Now find siblings of the child and add the parent as their parent too
  const childSiblings = childRels.filter(rel => 
    ['brother', 'sister', 'sibling'].includes(rel.relationship_type.toLowerCase())
  );

  console.log('Child siblings:', childSiblings);

  // Add parent relationship to all siblings of the child
  for (const sibling of childSiblings) {
    // Check if this sibling already has this parent
    const { data: existingParentRel } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', sibling.related_resident_id)
      .eq('related_resident_id', parentId)
      .or('relationship_type.eq.father,relationship_type.eq.mother,relationship_type.eq.parent')
      .single();

    if (!existingParentRel) {
      console.log('Adding parent relationship to sibling:', sibling.related_resident_id, 'parent:', parentId);
      
      // Get the original relationship type from the parent to determine the type
      const parentType = parentRels.find(rel => rel.related_resident_id === childId)?.relationship_type || 'parent';
      await addParentChildRelationshipPair(sibling.related_resident_id, parentId, parentType);
    }
  }
};

// Infer relationships when child-parent connection is made
const inferChildParentRelationships = async (childId: string, parentId: string, childRels: any[], parentRels: any[]) => {
  // This is essentially the same as parent-child but with roles reversed
  await inferParentChildRelationships(parentId, childId, parentRels, childRels);
};

// Helper function to add parent-child relationship pair
const addParentChildRelationshipPair = async (childId: string, parentId: string, parentType: string) => {
  try {
    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', childId)
      .eq('related_resident_id', parentId)
      .eq('relationship_type', parentType)
      .single();

    if (!existing) {
      // Add parent relationship to child
      await supabase.from('relationships').insert({
        resident_id: childId,
        related_resident_id: parentId,
        relationship_type: parentType
      });

      // Add child relationship from parent to child
      const reverseType = getReverseRelationshipType(parentType);
      if (reverseType) {
        const { data: existingReverse } = await supabase
          .from('relationships')
          .select('*')
          .eq('resident_id', parentId)
          .eq('related_resident_id', childId)
          .eq('relationship_type', reverseType)
          .single();

        if (!existingReverse) {
          await supabase.from('relationships').insert({
            resident_id: parentId,
            related_resident_id: childId,
            relationship_type: reverseType
          });
        }
      }
    }
  } catch (error) {
    console.error('Error adding parent-child relationship pair:', error);
  }
};

// Helper function to add sibling relationship pair
const addSiblingRelationshipPair = async (resident1Id: string, resident2Id: string) => {
  try {
    // Check if sibling relationship already exists
    const { data: existingSibling } = await supabase
      .from('relationships')
      .select('*')
      .eq('resident_id', resident1Id)
      .eq('related_resident_id', resident2Id)
      .or('relationship_type.eq.sibling,relationship_type.eq.brother,relationship_type.eq.sister')
      .single();

    if (!existingSibling) {
      console.log('Adding sibling relationships between:', resident1Id, 'and', resident2Id);
      
      // Add sibling relationships both ways
      await supabase.from('relationships').insert([
        {
          resident_id: resident1Id,
          related_resident_id: resident2Id,
          relationship_type: 'sibling'
        },
        {
          resident_id: resident2Id,
          related_resident_id: resident1Id,
          relationship_type: 'sibling'
        }
      ]);
    }
  } catch (error) {
    console.error('Error adding sibling relationship pair:', error);
  }
};

// Search residents for relationship selection
export const searchResidentsForRelationship = async (searchTerm: string, excludeId: string) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: [] };
    }

    const searchQuery = searchTerm.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, suffix, purok')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,middle_name.ilike.%${searchQuery}%`)
      .neq('id', excludeId)
      .limit(10);

    if (error) throw error;

    const transformedData = data
      .map(resident => ({
        ...resident,
        full_name: `${resident.first_name} ${resident.middle_name ? resident.middle_name + ' ' : ''}${resident.last_name}${resident.suffix ? ' ' + resident.suffix : ''}`
      }))
      .filter(resident => {
        const fullNameLower = resident.full_name.toLowerCase();
        const searchWords = searchQuery.split(' ').filter(word => word.length > 0);
        return searchWords.every(word => fullNameLower.includes(word));
      });

    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('Error searching residents for relationship:', error);
    return { success: false, error: error.message, data: [] };
  }
};
