import { AvatarPlaceholder, useConnection, useViewerID, useViewerRecord } from '@self.id/framework';
import { IconLogout } from '@tabler/icons';
// import { useAuth } from 'utils/useAuth';
// import Identicon from 'components/home/Identicon';
// import { addEllipsis } from 'utils/string';
import { getProfileInfo } from 'utils/getProfileInfo';

export default function HomeHeader() {
  // const { user, signOut } = useAuth();
  const [, , disconnect] = useConnection();
  const viewerID = useViewerID();
  const profileRecord = useViewerRecord('basicProfile');

  if (viewerID == null) {
    return <div className="flex items-center"></div>;
  }

  const { avatarSrc, displayName } = getProfileInfo(viewerID.id, profileRecord.content);

  return (
    <div className="flex items-center">
      {/* <span className="mr-2 text-sm">{user?.id && addEllipsis(user?.id)}</span> */}
      <span className="mr-2 text-sm">{displayName}</span>
      {/* <Identicon diameter={16} className="w-5 h-5" /> */}
      {/* {avatarSrc ? <Avatar size="20px" src={avatarSrc} /> : <AvatarPlaceholder did={viewerID.id} size={20} />} */}
      <AvatarPlaceholder did={viewerID.id} size={20} />
      <button className="hover:text-gray-500 py-1 pl-2 pr-1 ml-2 rounded" onClick={disconnect}>
        <IconLogout size={20} className="" />
      </button>
    </div>
  );
}
