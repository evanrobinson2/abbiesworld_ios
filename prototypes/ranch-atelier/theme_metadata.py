"""Semantic roles from generator material names and object purpose, never RGB guesses."""
import re

def surface_metadata(category, material, name, color):
    key = re.sub(r'\.\d+$', '', material)
    obj = name.lower()
    role = 'unmapped'
    if category == 'buildings':
        role = {'wood':'timber','end':'timber','wall':'plaster','roof':'roof','water':'water','green':'foliage'}.get(key, 'unmapped')
    elif category == 'supplies':
        role = {'wood':'timber','end':'timber','water':'water','earth':'soil','leaf':'foliage'}.get(key, 'unmapped')
    elif category == 'workers':
        key = key.rsplit('-', 1)[-1]
        role = {'skin':'skin','hair':'hair','shirt':'fabric','trousers':'fabric','hat':'fabric'}.get(key, 'unmapped')
    elif category == 'organics':
        role = {'green':'foliage','light':'foliage','cut':'timber','chestnut':'fur','milk':'fur','patch':'fur','mane':'hair','fur':'fur','collar':'fabric','tag':'metal'}.get(key, 'unmapped')
        if key == 'wood' and any(s in obj for s in ['trunk','root','branch']): role = 'bark'
        if key == 'cream' and not any(s in obj for s in ['eye','glint']): role = 'fur'
    return {'role':role,'defaultColor':list(color),'materialName':material,'surfaceName':name,'roleSource':'generator-material-and-object' if role != 'unmapped' else 'unmapped-preserve-original'}
