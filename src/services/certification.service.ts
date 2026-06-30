import Certification from '../models/certification.model';
import StoreRecipe from '../models/store-recipe.model';

interface CertInfo {
  id: string;
  name: string;
  expiresAt?: Date;
}

export interface CertCheckResult {
  certified: boolean;
  missingCerts: Array<{ id: string; name: string }>;
  heldCerts: CertInfo[];
}

function formatCertTypeName(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determines whether a user holds at least one active certification required
 * to prepare a given store recipe.
 *
 * @param params.userId  - The user's ObjectId as a string.
 * @param params.recipeId - The StoreRecipe ObjectId as a string.
 * @returns `certified` true when the recipe requires no certs OR the user holds
 *          at least one qualifying active cert.  Never throws — returns
 *          `certified: false` with empty arrays on unexpected errors.
 */
export async function userHasRecipeCertification(params: {
  userId: string;
  recipeId: string;
}): Promise<CertCheckResult> {
  try {
    const { userId, recipeId } = params;

    const recipe = await StoreRecipe.findById(recipeId).select(
      'certificationRequired requiredCertifications'
    );

    if (
      !recipe ||
      !recipe.certificationRequired ||
      recipe.requiredCertifications.length === 0
    ) {
      return { certified: true, missingCerts: [], heldCerts: [] };
    }

    const requiredTypes = recipe.requiredCertifications;

    const heldCertDocs = await Certification.find({
      user: userId,
      status: 'active',
      type: { $in: requiredTypes as import('../models/certification.model').CertificationType[] },
    }).select('type expiresAt');

    const heldTypeSet = new Set(heldCertDocs.map((c) => c.type));

    const heldCerts: CertInfo[] = heldCertDocs.map((c) => ({
      id: (c._id as { toString(): string }).toString(),
      name: formatCertTypeName(c.type),
      expiresAt: c.expiresAt,
    }));

    const missingCerts = requiredTypes
      .filter((t) => !heldTypeSet.has(t as any))
      .map((t) => ({ id: t, name: formatCertTypeName(t) }));

    return {
      certified: heldCertDocs.length > 0,
      missingCerts,
      heldCerts,
    };
  } catch {
    return { certified: false, missingCerts: [], heldCerts: [] };
  }
}
